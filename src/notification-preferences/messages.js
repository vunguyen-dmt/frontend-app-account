import { defineMessages } from '@edx/frontend-platform/i18n';

// eslint-disable-next-line import/prefer-default-export
export const messages = defineMessages({
  notificationHeading: {
    id: 'notification.preference.heading',
    defaultMessage: 'Notifications',
    description: 'Notification title',
  },
  notificationAppTitle: {
    id: 'notification.preference.app.title',
    defaultMessage: `{
        key, select,
        discussion {Discussions}
        coursework {Course Work}
        other {{key}}
    }`,
    description: 'Display text for Notification Types',
  },
  notificationTitle: {
    id: 'notification.preference.title',
    defaultMessage: `{
        text, select,
        core {Core notifications}
        newDiscussionPost {New discussion posts}
        newQuestionPost {New question posts}
        other {{text}}
    }`,
    description: 'Display text for Notification Types',
  },
  typeLabel: {
    id: 'notification.preference.type.label',
    defaultMessage: 'Type',
    description: 'Display text for type',
  },
  webLabel: {
    id: 'notification.preference.web,label',
    defaultMessage: 'Web',
    description: 'Display text for web',
  },
  notificationHelpEmail: {
    id: 'notification.preference.help.email',
    defaultMessage: 'Email',
    description: 'Display text for email',
  },
  notificationHelpPush: {
    id: 'notification.preference.help.push',
    defaultMessage: 'Push',
    description: 'Display text for push',
  },
  loadMoreCourses: {
    id: 'notification.preference.load.more.courses',
    defaultMessage: 'Load more courses',
    description: 'Load more button to load more courses',
  },
  notificationPreferenceGuideLink: {
    id: 'notification.preference.guide.link',
    defaultMessage: 'as detailed here',
    description: 'Link of the notification preference for learner guide',
  },
  notificationPreferenceGuideBody: {
    id: 'notification.preference.guide.body',
    defaultMessage: 'Notifications for certain activities are enabled by default, ',
    description: 'Body of the notification preferences for learner guide',
  },
});
