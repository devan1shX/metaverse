const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { SpaceRepository, UserRepository, NotificationRepository } = require('../repositories');
const { Notification } = require('../models/Notification'); // <-- Add this import

class InviteService {
    /**
     * Send an invite from one user to another for a space
     */
    static async sendInvite(fromUserId, toUserId, spaceId) {
        try {
            // ---- ADD THESE LINES ----
    const spaceRepositoryInstance = new SpaceRepository();
    const userRepositoryInstance = new UserRepository();
    const notificationRepositoryInstance = new NotificationRepository();
    // -------------------------

    // Validate sender has access to the space
    // Modify this line:
    // const space = await SpaceRepository.findById(spaceId);
    // To this:
    const space = await spaceRepositoryInstance.findById(spaceId); // Use instance
    if (!space) {
                return {
                    success: false,
                    error: 'Space not found'
                };
            }

            // Check if sender is admin or member of the space
            const senderIsAdmin = space.admin_user_id === fromUserId;
            const senderIsMember = await spaceRepositoryInstance.isUserMember(spaceId, fromUserId); // Corrected: isUserMember
            
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
            const isAlreadyMember = await spaceRepositoryInstance.isUserMember(spaceId, toUserId); // Use instance
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
            const sender = await userRepositoryInstance.findById(fromUserId); // Use instance

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

            // Create an instance of the Notification model
const notificationData = {
    id: uuidv4(),
    userId: toUserId, // Use userId as per the Notification model constructor
    type: 'invites',
    title: `Space Invite from ${sender.username}`,
    message: `${sender.username} has invited you to join the space '${space.name}'`,
    data: inviteData,
    status: 'unread',
    expiresAt: expiresAt, // Use expiresAt as per the Notification model constructor
    isActive: true      // Use isActive as per the Notification model constructor
};
const notificationInstance = new Notification(notificationData); // <-- Create instance

// Now pass the instance to the create method
const createdNotification = await notificationRepositoryInstance.create(notificationInstance); // <-- Pass the instance

// Check if creation was successful before proceeding
if (!createdNotification) {
    logger.error('Failed to save notification to database', { notificationData });
    return {
        success: false,
        error: 'Failed to create notification entry'
    };
}

// Use the returned notification object for the response
logger.info('Invite sent', { fromUserId, toUserId, spaceId, notificationId: createdNotification.id });

return {
    success: true,
    message: 'Invite sent successfully',
    invite: {
        id: createdNotification.id, // Use ID from the created object
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
            // ---- ADD THESE LINES ----
    const notificationRepositoryInstance = new NotificationRepository();
    const spaceRepositoryInstance = new SpaceRepository();
    // -------------------------

    // Get and validate the invite
    // Modify this line:
    // const invite = await NotificationRepository.findById(notificationId);
    // To this:
    const invite = await notificationRepositoryInstance.findById(notificationId); // Use instance
            
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
            if (!space || !space.is_active) {
                return {
                    success: false,
                    error: 'Space no longer exists or is inactive'
                };
            }

            // Check if space is full
            const currentUsers = await spaceRepositoryInstance.getUserCount(spaceId);
            if (currentUsers >= space.max_users) {
                return {
                    success: false,
                    error: 'Space is now full'
                };
            }

            // Check if user is already a member
            const isAlreadyMember = await spaceRepositoryInstance.isUserMember(spaceId, userId);
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
            // ---- ADD THIS LINE ----
    const notificationRepositoryInstance = new NotificationRepository();
    // -----------------------

    // Get and validate the invite
    // Modify this line:
    // const invite = await NotificationRepository.findById(notificationId);
    // To this:
    const invite = await notificationRepositoryInstance.findById(notificationId); // Use instance
            
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
            await notificationRepositoryInstance.update(notificationId, { status: 'dismissed' });

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
            const userRepositoryInstance = new UserRepository(); // Create an instance
const users = await userRepositoryInstance.findUsersNotInSpace(spaceId, requestingUserId); // Call on the instance
            
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
            // ---- ADD THIS LINE ----
    const notificationRepositoryInstance = new NotificationRepository();
    // -----------------------

    // Modify this line:
    // const invites = await NotificationRepository.findUserInvites(userId, includeExpired);
    // To this:
    const invites = await notificationRepositoryInstance.findUserInvites(userId, includeExpired); // Use instance
            
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

