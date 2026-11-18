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
    path: 'mentor/register',
    title: 'Become a Mentor',
    description: 'Share your experience and help the next generation grow.',
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
    navigation: [
      {
        label: 'WORKSPACE',
        items: [
          { path: '', label: 'Dashboard', icon: 'dashboard', exact: true },
          { path: 'profile', label: 'My Profile', icon: 'profile' },
          {
            path: 'match',
            label: 'Find a Mentor',
            icon: 'search',
            activePaths: ['match', 'mentorship/request', 'mentorship/request/:id'],
          },
          {
            path: 'mentor',
            label: 'My Mentor',
            icon: 'mentor',
            activePaths: ['mentor', 'mentorship/relationships', 'mentorship/relationships/:id'],
            exactActivePaths: ['mentorship/relationships', 'mentorship/relationships/:id'],
          },
          {
            path: 'goals',
            label: 'Goals & Progress',
            icon: 'goals',
            activePaths: ['goals', 'goals/:relationshipId/:goalId', 'progress'],
          },
          {
            path: 'messages',
            label: 'Messages',
            icon: 'messages',
            activePaths: ['messages', 'mentorship/relationships/:id/messages'],
          },
          { path: 'resources', label: 'Resources', icon: 'resources' },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { path: 'feedback', label: 'Feedback', icon: 'feedback' },
          { path: 'settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
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
        navLabel: 'Find a Match',
        title: 'Find a Match',
        description: 'Discover your best mentor matches using AI-powered compatibility scoring.',
      },
      {
        path: 'mentor',
        title: 'My Mentor',
        description: 'View and manage your mentorship relationships.',
      },
      {
        path: 'messages',
        navLabel: 'Messages',
        title: 'Messages',
        description: 'Continue conversations with your mentors.',
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
        path: 'mentorship/relationships/:id/messages',
        title: 'Messages',
        description: 'View and send messages with your mentor for this relationship.',
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
    navigation: [
      {
        label: 'WORKSPACE',
        items: [
          { path: '', label: 'Dashboard', icon: 'dashboard', exact: true },
          { path: 'profile', label: 'My Profile', icon: 'profile' },
          { path: 'matches', label: 'Mentee Matches', icon: 'search' },
          {
            path: 'mentees',
            label: 'My Mentees',
            icon: 'mentor',
            activePaths: ['mentees', 'mentorship/relationships', 'mentorship/relationships/:id'],
            exactActivePaths: ['mentorship/relationships', 'mentorship/relationships/:id'],
          },
          {
            path: 'goals',
            label: 'Goals & Progress',
            icon: 'goals',
            activePaths: ['goals', 'goals/:relationshipId/:goalId'],
          },
          {
            path: 'messages',
            label: 'Messages',
            icon: 'messages',
            activePaths: ['messages', 'mentorship/relationships/:id/messages'],
          },
          { path: 'resources', label: 'Resources', icon: 'resources' },
          { path: 'mentorship/requests', label: 'Incoming Requests', icon: 'requests' },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { path: 'feedback', label: 'Feedback', icon: 'feedback' },
          { path: 'reports', label: 'Reports', icon: 'reports' },
          { path: 'settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
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
        path: 'mentorship/relationships/:id/messages',
        title: 'Messages',
        description: 'View and send messages with your mentee for this relationship.',
      },
      {
        path: 'messages',
        navLabel: 'Messages',
        title: 'Messages',
        description: 'Continue conversations with your mentees.',
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
    navigation: [
      {
        label: 'ADMINISTRATION',
        items: [
          { path: '', label: 'Dashboard', icon: 'dashboard', exact: true },
          { path: 'users', label: 'Users', icon: 'users' },
          { path: 'mentor-applications', label: 'Mentor Applications', icon: 'applications' },
          { path: 'mentors', label: 'Mentors', icon: 'mentor' },
          { path: 'mentees', label: 'Mentees', icon: 'profile' },
          {
            path: 'cohorts',
            label: 'Cohorts',
            icon: 'users',
            activePaths: ['cohorts', 'cohorts/:cohortId/matching'],
          },
          { path: 'matches', label: 'AI Matches', icon: 'search' },
          { path: 'relationships', label: 'Relationships', icon: 'relationships' },
          { path: 'content', label: 'Content', icon: 'content' },
          { path: 'resources', label: 'Resources', icon: 'resources' },
          { path: 'feedback', label: 'Feedback', icon: 'feedback' },
          { path: 'notifications', label: 'Notifications', icon: 'notifications' },
          { path: 'analytics', label: 'Analytics', icon: 'reports' },
          { path: 'reports', label: 'Reports', icon: 'reports' },
          { path: 'audit', label: 'Activity Log', icon: 'audit' },
          { path: 'settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
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
        path: 'cohorts',
        title: 'Cohorts',
        description: 'Manage mentorship programme cohorts and their participant rosters.',
      },
      {
        path: 'cohorts/:cohortId/matching',
        title: 'Cohort Matching Review',
        description: 'Review cohort-wide mentor recommendations and approved pairings.',
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
        path: 'analytics',
        title: 'Analytics',
        description: 'Explore academy metrics from the administration dashboard.',
      },
      {
        path: 'settings',
        title: 'Settings',
        description: 'Manage Academy and workspace preferences.',
      },
    ],
  },
];
