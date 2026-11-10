export const publicRoutes = [
  {
    path: 'about',
    title: 'About the Academy',
    description:
      'Learn about the Mentorship Academy and the community behind its work.',
  },
  {
    path: 'programmes',
    title: 'Programmes',
    description:
      'Explore the mentorship programmes offered by the Academy.',
  },
  {
    path: 'how-it-works',
    title: 'How It Works',
    description:
      'See how a mentorship journey takes shape, from a first connection to shared growth.',
  },
  {
    path: 'stories',
    title: 'Stories',
    description:
      'Discover stories and perspectives from the Mentorship Academy community.',
  },
  {
    path: 'resources',
    title: 'Resources',
    description:
      'Find practical resources to support learning and mentorship.',
  },
  {
    path: 'contact',
    title: 'Contact',
    description: 'Get in touch with the Mentorship Academy team.',
  },
  {
    path: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions about the Academy.',
  },
  {
    path: 'become-a-mentor',
    title: 'Become a Mentor',
    description:
      'Share your experience and help someone else grow through mentorship.',
  },
  {
    path: 'become-a-mentee',
    title: 'Become a Mentee',
    description: 'Take the next step in your mentorship journey.',
  },
  {
    path: 'login',
    title: 'Log In',
    description: 'Log in to continue your Mentorship Academy journey.',
  },
  {
    path: 'register',
    title: 'Register',
    description: 'Create a mentee account and begin your mentorship journey.',
  },
];

export const workspaceRoutes = [
  {
    role: 'Mentee',
    basePath: '/mentee',
    description: 'Your mentorship journey starts here.',
    pages: [
      {
        path: '',
        navLabel: 'Dashboard',
        title: 'Mentee Dashboard',
        description: 'Your mentorship journey starts here.',
      },
      {
        path: 'profile',
        title: 'My Profile',
        description: 'Your personal details and mentorship interests will live here.',
      },
      {
        path: 'mentorship/request',
        navLabel: 'Find a Mentor',
        title: 'Find a Mentor',
        description: 'Browse approved mentors and request mentorship.',
      },
      {
        path: 'mentorship/request/:id',
        title: 'Request Mentorship',
        description: 'Send a mentorship request to a specific mentor.',
      },
      {
        path: 'mentorship/requests',
        navLabel: 'My Requests',
        title: 'My Requests',
        description: 'Track the status of your mentorship requests.',
      },
      {
        path: 'mentorship/relationships',
        navLabel: 'My Relationships',
        title: 'My Relationships',
        description: 'View and manage your mentorship relationships.',
      },
      {
        path: 'mentorship/relationships/:id',
        title: 'Relationship Details',
        description: 'View details of a specific mentorship relationship.',
      },
      {
        path: 'match',
        title: 'Find a Match',
        description: 'Your mentor matching experience will be available in a later phase.',
      },
      {
        path: 'mentor',
        title: 'My Mentor',
        description: 'Your mentor connection and shared details will appear here.',
      },
      {
        path: 'goals',
        navLabel: 'My Goals',
        title: 'My Goals',
        description: 'Set and revisit the goals that guide your mentorship journey.',
      },
      {
        path: 'goals/:relationshipId/:goalId',
        title: 'Goal Details',
        description: 'View and manage a specific goal.',
      },
      {
        path: 'journey',
        title: 'My Journey',
        description: 'Follow the key moments in your mentorship journey.',
      },
      {
        path: 'messages',
        title: 'Messages',
        description: 'Mentorship conversations will be available in a later phase.',
      },
      {
        path: 'progress',
        navLabel: 'My Progress',
        title: 'My Progress',
        description: 'Reflect on your growth and progress over time.',
      },
      {
        path: 'resources',
        title: 'Resources',
        description: 'Explore resources to support your development.',
      },
      {
        path: 'feedback',
        title: 'Feedback',
        description: 'Share feedback about your mentorship experience.',
      },
      {
        path: 'settings',
        title: 'Settings',
        description: 'Manage your account and workspace preferences.',
      },
    ],
  },
  {
    role: 'Mentor',
    basePath: '/mentor',
    description: 'Your mentoring workspace starts here.',
    pages: [
      {
        path: '',
        navLabel: 'Dashboard',
        title: 'Mentor Dashboard',
        description: 'Your mentoring workspace starts here.',
      },
      {
        path: 'profile',
        title: 'My Profile',
        description: 'Your experience and mentoring interests will live here.',
      },
      {
        path: 'application',
        title: 'Mentor Application',
        description: 'Your mentor application experience will be available in a later phase.',
      },
      {
        path: 'mentorship/requests',
        navLabel: 'Incoming Requests',
        title: 'Incoming Requests',
        description: 'Review and respond to mentorship requests from mentees.',
      },
      {
        path: 'mentorship/relationships',
        navLabel: 'My Relationships',
        title: 'My Relationships',
        description: 'View and manage your mentorship relationships with mentees.',
      },
      {
        path: 'mentorship/relationships/:id',
        title: 'Relationship Details',
        description: 'View details of a specific mentorship relationship.',
      },
      {
        path: 'matches',
        title: 'Matches',
        description: 'Your mentorship matches will be available in a later phase.',
      },
      {
        path: 'mentees',
        title: 'My Mentees',
        description: 'Your mentee connections and shared details will appear here.',
      },
      {
        path: 'goals',
        navLabel: 'Goals',
        title: 'Goals',
        description: 'Review and support goals across your mentorship relationships.',
      },
      {
        path: 'goals/:relationshipId/:goalId',
        title: 'Goal Details',
        description: 'View a mentee goal and add feedback.',
      },
      {
        path: 'messages',
        title: 'Messages',
        description: 'Mentorship conversations will be available in a later phase.',
      },
      {
        path: 'resources',
        title: 'Resources',
        description: 'Explore resources to support your mentoring practice.',
      },
      {
        path: 'reports',
        title: 'Reports',
        description: 'Mentorship reports will be available in a later phase.',
      },
      {
        path: 'feedback',
        title: 'Feedback',
        description: 'Share and review feedback about your mentoring experience.',
      },
      {
        path: 'settings',
        title: 'Settings',
        description: 'Manage your account and workspace preferences.',
      },
    ],
  },
  {
    role: 'Admin',
    basePath: '/admin',
    description: 'The Academy administration workspace starts here.',
    pages: [
      {
        path: '',
        navLabel: 'Dashboard',
        title: 'Admin Dashboard',
        description: 'The Academy administration workspace starts here.',
      },
      {
        path: 'users',
        title: 'Users',
        description: 'User administration will be available in a later phase.',
      },
      {
        path: 'mentor-applications',
        title: 'Mentor Applications',
        description: 'Mentor application review will be available in a later phase.',
      },
      {
        path: 'mentors',
        title: 'Mentors',
        description: 'Mentor administration will be available in a later phase.',
      },
      {
        path: 'mentees',
        title: 'Mentees',
        description: 'Mentee administration will be available in a later phase.',
      },
      {
        path: 'matches',
        title: 'Matches',
        description: 'Match administration will be available in a later phase.',
      },
      {
        path: 'relationships',
        title: 'Relationships',
        description: 'Mentorship relationship oversight will be available in a later phase.',
      },
      {
        path: 'content',
        title: 'Content',
        description: 'Content administration will be available in a later phase.',
      },
      {
        path: 'resources',
        title: 'Resources',
        description: 'Resource administration will be available in a later phase.',
      },
      {
        path: 'feedback',
        title: 'Feedback',
        description: 'Feedback administration will be available in a later phase.',
      },
      {
        path: 'notifications',
        title: 'Notifications',
        description: 'Notification administration will be available in a later phase.',
      },
      {
        path: 'reports',
        title: 'Reports',
        description: 'Academy reports will be available in a later phase.',
      },
      {
        path: 'audit',
        title: 'Audit Log',
        description: 'Audit history will be available in a later phase.',
      },
      {
        path: 'settings',
        title: 'Settings',
        description: 'Manage Academy and workspace preferences.',
      },
    ],
  },
];
