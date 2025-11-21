const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const SpaceRepository = require('../repositories/SpaceRepository');
const UserRepository = require('../repositories/UserRepository');
const NotificationRepository = require('../repositories/NotificationRepository');
const { Notification } = require('../models/Notification');

class InviteService {
    /**
     * Send an invite from one user to another for a space
     */
    static async sendInvite(fromUserId, toUserId, spaceId) {
        try {

            const spaceRepositoryInstance = new SpaceRepository();
            const userRepositoryInstance = new UserRepository();
            const notificationRepositoryInstance = new NotificationRepository();

            
            // Validate sender has access to the space
            const space = await spaceRepositoryInstance.findById(spaceId);
            if (!space) {
                return {
                    success: false,
                    error: 'Space not found'
                };
            }

            // Check if sender is admin or member of the space
            const senderIsAdmin = space.adminUserId === fromUserId;
            const senderIsMember = await spaceRepositoryInstance.isUserMember(spaceId, fromUserId); 
            
            if (!senderIsAdmin && !senderIsMember) {
                return {
                    success: false,
                    error: 'You do not have access to this space'
                };
            }

            // Check if space is full
            const currentUsers = await spaceRepositoryInstance.getUserCount(spaceId);
            if (currentUsers >= space.max_users) {
                return {
                    success: false,
                    error: 'Space is full'
                };
            }

            // Validate recipient exists
            const recipient = await userRepositoryInstance.findById(toUserId);
            if (!recipient) {
                return {
                    success: false,
                    error: 'Recipient user does not exist'
                };
            }

            // Check if recipient is already a member
            const isAlreadyMember = await spaceRepositoryInstance.isUserMember(spaceId, toUserId);
            if (isAlreadyMember) {
                return {
                    success: false,
                    error: 'User is already a member of this space'
                };
            }

            // Check for existing pending invite
            const existingInvite = await notificationRepositoryInstance.findPendingSpaceInvite(toUserId, spaceId);
            if (existingInvite) {
                return {
                    success: false,
                    error: 'A pending invite already exists for this user and space'
                };
            }

            // Get sender info
            const sender = await userRepositoryInstance.findById(fromUserId); 

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

            // const notification = await NotificationRepository.create({
            //     id: uuidv4(),
            //     user_id: toUserId,
            //     type: 'invites',
            //     title: `Space Invite from ${sender.username}`,
            //     message: `${sender.username} has invited you to join the space '${space.name}'`,
            //     data: inviteData,
            //     status: 'unread',
            //     expires_at: expiresAt,
            //     is_active: true
            // });

            const notificationData = {
                id: uuidv4(),
                userId: toUserId, 
                type: 'invites',
                title: `Space Invite from ${sender.username}`,
                message: `${sender.username} has invited you to join the space '${space.name}'`,
                data: inviteData,
                status: 'unread',
                expiresAt: expiresAt, 
                isActive: true      
            };

            const notificationInstance = new Notification(notificationData);

            const createdNotification = await notificationRepositoryInstance.create(notificationInstance); 
            
            if (!createdNotification) {
                logger.error('Failed to save notification to database', { notificationData });
                return {
                    success: false,
                    error: 'Failed to create notification entry'
                };
            }
            
            logger.info('Invite sent', { fromUserId, toUserId, spaceId, notificationId: createdNotification.id });
            
            return {
                success: true,
                message: 'Invite sent successfully',
                invite: {
                    id: createdNotification.id, 
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
            const notificationRepositoryInstance = new NotificationRepository();
            const spaceRepositoryInstance = new SpaceRepository();
            // Get and validate the invite
            const invite = await notificationRepositoryInstance.findById(notificationId); 
            
            if (!invite || invite.userId !== userId || invite.type !== 'invites') {
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
            if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
                // await NotificationRepository.update(notificationId, { status: 'dismissed' });
                await notificationRepositoryInstance.update(notificationId, { status: 'dismissed' });
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
            const space = await spaceRepositoryInstance.findById(spaceId);
            if (!space || !space.isActive) {
                return {
                    success: false,
                    error: 'Space no longer exists or is inactive'
                };
            }

            // Check if space is full
            const currentUsers = await spaceRepositoryInstance.getUserCount(spaceId);
            if (currentUsers >= space.maxUsers) {
                return {
                    success: false,
                    error: 'Space is now full'
                };
            }

            // Check if user is already a member
            const isAlreadyMember = await spaceRepositoryInstance.isUserMember(spaceId, userId);
            if (isAlreadyMember) {
                invite.markAsRead(); // Use the model method
                await notificationRepositoryInstance.update(invite); // Pass the instance
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
            await spaceRepositoryInstance.addUserToSpace(spaceId, userId);

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
            const notificationRepositoryInstance = new NotificationRepository();
            // Get and validate the invite
            const invite = await notificationRepositoryInstance.findById(notificationId); 
            
            if (!invite || invite.userId !== userId || invite.type !== 'invites') {
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
            invite.dismiss(); // Use the model method
            await notificationRepositoryInstance.update(invite); // Pass the instance

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
            const userRepositoryInstance = new UserRepository(); 
            const users = await userRepositoryInstance.findUsersNotInSpace(spaceId, requestingUserId);
            
            return {
                success: true,
                users: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatarUrl: user.avatarUrl
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
            const notificationRepositoryInstance = new NotificationRepository();
            const invites = await notificationRepositoryInstance.findUserInvites(userId, includeExpired);
            
            return {
                success: true,
                invites: invites.map(invite => ({
                    id: invite.id,
                    title: invite.title,
                    message: invite.message,
                    data: invite.data,
                    status: invite.status,
                    createdAt: invite.createdAt,
                    expiresAt: invite.expiresAt,
                    isExpired: invite.expiresAt ? new Date(invite.expiresAt) < new Date() : false
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

