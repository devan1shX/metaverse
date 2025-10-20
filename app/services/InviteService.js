const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { SpaceRepository, UserRepository, NotificationRepository } = require('../repositories');

class InviteService {
    /**
     * Send an invite from one user to another for a space
     */
    static async sendInvite(fromUserId, toUserId, spaceId) {
        try {
            // Validate sender has access to the space
            const space = await SpaceRepository.findById(spaceId);
            if (!space) {
                return {
                    success: false,
                    error: 'Space not found'
                };
            }

            // Check if sender is admin or member of the space
            const senderIsAdmin = space.admin_user_id === fromUserId;
            const senderIsMember = await SpaceRepository.isUserMember(spaceId, fromUserId);
            
            if (!senderIsAdmin && !senderIsMember) {
                return {
                    success: false,
                    error: 'You do not have access to this space'
                };
            }

            // Check if space is full
            const currentUsers = await SpaceRepository.getUserCount(spaceId);
            if (currentUsers >= space.max_users) {
                return {
                    success: false,
                    error: 'Space is full'
                };
            }

            // Validate recipient exists
            const recipient = await UserRepository.findById(toUserId);
            if (!recipient) {
                return {
                    success: false,
                    error: 'Recipient user does not exist'
                };
            }

            // Check if recipient is already a member
            const isAlreadyMember = await SpaceRepository.isUserMember(spaceId, toUserId);
            if (isAlreadyMember) {
                return {
                    success: false,
                    error: 'User is already a member of this space'
                };
            }

            // Check for existing pending invite
            const existingInvite = await NotificationRepository.findPendingSpaceInvite(toUserId, spaceId);
            if (existingInvite) {
                return {
                    success: false,
                    error: 'A pending invite already exists for this user and space'
                };
            }

            // Get sender info
            const sender = await UserRepository.findById(fromUserId);

            // Create notification for the invite
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

            const inviteData = {
                spaceId: spaceId,
                spaceName: space.name,
                fromUserId: fromUserId,
                fromUsername: sender.username,
                inviteType: 'space_invite'
            };

            const notification = await NotificationRepository.create({
                id: uuidv4(),
                user_id: toUserId,
                type: 'invites',
                title: `Space Invite from ${sender.username}`,
                message: `${sender.username} has invited you to join the space '${space.name}'`,
                data: inviteData,
                status: 'unread',
                expires_at: expiresAt,
                is_active: true
            });

            logger.info('Invite sent', { fromUserId, toUserId, spaceId, notificationId: notification.id });

            return {
                success: true,
                message: 'Invite sent successfully',
                invite: {
                    id: notification.id,
                    toUser: {
                        id: toUserId,
                        username: recipient.username
                    },
                    fromUser: {
                        id: fromUserId,
                        username: sender.username
                    },
                    space: {
                        id: spaceId,
                        name: space.name
                    },
                    expiresAt: expiresAt.toISOString()
                }
            };

        } catch (error) {
            logger.error('Error sending invite', { error: error.message, fromUserId, toUserId, spaceId });
            return {
                success: false,
                error: 'Failed to send invite'
            };
        }
    }

    /**
     * Accept a space invite
     */
    static async acceptInvite(userId, notificationId) {
        try {
            // Get and validate the invite
            const invite = await NotificationRepository.findById(notificationId);
            
            if (!invite || invite.user_id !== userId || invite.type !== 'invites') {
                return {
                    success: false,
                    error: 'Invite not found'
                };
            }

            if (invite.status !== 'unread') {
                return {
                    success: false,
                    error: 'Invite has already been processed'
                };
            }

            // Check if expired
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                await NotificationRepository.update(notificationId, { status: 'dismissed' });
                return {
                    success: false,
                    error: 'Invite has expired'
                };
            }

            const spaceId = invite.data.spaceId;
            if (!spaceId) {
                return {
                    success: false,
                    error: 'Invalid invite data'
                };
            }

            // Validate space still exists and is active
            const space = await SpaceRepository.findById(spaceId);
            if (!space || !space.is_active) {
                return {
                    success: false,
                    error: 'Space no longer exists or is inactive'
                };
            }

            // Check if space is full
            const currentUsers = await SpaceRepository.getUserCount(spaceId);
            if (currentUsers >= space.max_users) {
                return {
                    success: false,
                    error: 'Space is now full'
                };
            }

            // Check if user is already a member
            const isAlreadyMember = await SpaceRepository.isUserMember(spaceId, userId);
            if (isAlreadyMember) {
                await NotificationRepository.update(notificationId, { status: 'read' });
                return {
                    success: true,
                    message: 'You are already a member of this space',
                    space: {
                        id: spaceId,
                        name: space.name
                    }
                };
            }

            // Add user to space
            await SpaceRepository.addUserToSpace(userId, spaceId);

            // Update notification status
            await NotificationRepository.update(notificationId, { status: 'read' });

            logger.info('User accepted invite', { userId, notificationId, spaceId });

            return {
                success: true,
                message: 'Invite accepted successfully',
                space: {
                    id: spaceId,
                    name: space.name
                }
            };

        } catch (error) {
            logger.error('Error accepting invite', { error: error.message, userId, notificationId });
            return {
                success: false,
                error: 'Failed to accept invite'
            };
        }
    }

    /**
     * Decline a space invite
     */
    static async declineInvite(userId, notificationId) {
        try {
            // Get and validate the invite
            const invite = await NotificationRepository.findById(notificationId);
            
            if (!invite || invite.user_id !== userId || invite.type !== 'invites') {
                return {
                    success: false,
                    error: 'Invite not found'
                };
            }

            if (invite.status !== 'unread') {
                return {
                    success: false,
                    error: 'Invite has already been processed'
                };
            }

            // Update notification status to dismissed
            await NotificationRepository.update(notificationId, { status: 'dismissed' });

            const spaceName = invite.data.spaceName || 'Unknown';

            logger.info('User declined invite', { userId, notificationId });

            return {
                success: true,
                message: 'Invite declined',
                spaceName: spaceName
            };

        } catch (error) {
            logger.error('Error declining invite', { error: error.message, userId, notificationId });
            return {
                success: false,
                error: 'Failed to decline invite'
            };
        }
    }

    /**
     * Get all users that can be invited (not in the space)
     */
    static async getInvitableUsers(requestingUserId, spaceId) {
        try {
            const users = await UserRepository.findUsersNotInSpace(spaceId, requestingUserId);
            
            return {
                success: true,
                users: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatarUrl: user.avatar_url
                })),
                count: users.length
            };

        } catch (error) {
            logger.error('Error getting invitable users', { error: error.message, requestingUserId, spaceId });
            return {
                success: false,
                error: 'Failed to get users',
                users: [],
                count: 0
            };
        }
    }

    /**
     * Get user's invites
     */
    static async getUserInvites(userId, includeExpired = false) {
        try {
            const invites = await NotificationRepository.findUserInvites(userId, includeExpired);
            
            return {
                success: true,
                invites: invites.map(invite => ({
                    id: invite.id,
                    title: invite.title,
                    message: invite.message,
                    data: invite.data,
                    status: invite.status,
                    createdAt: invite.created_at,
                    expiresAt: invite.expires_at,
                    isExpired: invite.expires_at ? new Date(invite.expires_at) < new Date() : false
                })),
                count: invites.length
            };

        } catch (error) {
            logger.error('Error getting user invites', { error: error.message, userId });
            return {
                success: false,
                error: 'Failed to get invites',
                invites: [],
                count: 0
            };
        }
    }
}

module.exports = InviteService;

