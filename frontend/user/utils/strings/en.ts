export const STRINGS = {
  APP: {
    NAME: "Amsh",
    COMPANY: "Amsh Platform",
  },
  AUTH: {
    LAYOUT: {
      LOGO: "Amsh",
      CHAT_USER: "Hi, I'd like to book a dental cleaning for next Tuesday afternoon.",
      CHAT_AI: "I can help with that! We have openings at 2:00 PM and 4:30 PM on Tuesday. Which works best?",
      HERO_TITLE: "Empower your business with non-stop AI receptionist support.",
      HERO_DESC: "Designed exclusively for businesses seeking operational elegance and infinite availability."
    },
    COMMON: {
      EMAIL_LABEL: "Work Email",
      EMAIL_PLACEHOLDER: "you@business.com",
      PASSWORD_LABEL: "Password",
      PASSWORD_PLACEHOLDER: "Enter password",
      FULL_NAME_LABEL: "Full Name",
      CONFIRM_PASSWORD_LABEL: "Confirm Password",
      OR: "or",
      CONTINUE_GOOGLE: "Continue with Google",
      BACK_TO_LOGIN: "Back to sign in"
    },
    LOGIN: {
      TITLE: "Welcome back",
      DESC: "Enter your credentials to access the Aira portal.",
      REMEMBER_ME: "Remember me",
      FORGOT_PASSWORD: "Forgot password?",
      SUBMIT: "Sign In",
      NO_ACCOUNT: "Don't have an account?",
      SIGN_UP: "Sign up"
    },
    REGISTER: {
      TITLE: "Create your account",
      DESC: "Get started with your free trial of Aira.",
      NAME_PLACEHOLDER: "Jane Doe",
      NEW_PASSWORD_PLACEHOLDER: "Create strong password",
      CONFIRM_PASSWORD_PLACEHOLDER: "Repeat your password",
      TERMS: "I agree to the",
      TOS: "Terms of Service",
      AND: "and",
      PRIVACY: "Privacy Policy",
      SUBMIT: "Create Account",
      HAS_ACCOUNT: "Already have an account?",
      SIGN_IN: "Sign in"
    },
    FORGOT_PASSWORD: {
      TITLE: "Reset your password",
      DESC: "Enter your work email address and we'll send you a link to reset your credentials.",
      SUBMIT: "Send Reset Link"
    },
    ACCEPT_INVITE: {
      TITLE_PREFIX: "You've been invited to join",
      TITLE_BUSINESS: "Smile Dental Clinic",
      DESC: "Dr. Sarah Wilson has invited you to join their team.",
      NAME_PLACEHOLDER: "Arthur Pendragon",
      SUBMIT: "Accept Invitation",
      DECLINE: "Decline invitation"
    },
    VERIFY_EMAIL: {
      TITLE: "Verify your email",
      DESC: "We've sent a verification link to s***@gmail.com. Please check your inbox and click the link to continue.",
      SUBMIT: "Resend verification email"
    }
  },
  COMMON: {
    BUTTONS: {
      SAVE: "Save",
      CANCEL: "Cancel",
      UPLOAD: "Upload New",
      REMOVE: "Remove",
      INVITE: "+ Invite Member",
      SEARCH: "Search...",
      NEW_APPOINTMENT: "New Appointment",
      ADD_PATIENT: "Add Patient",
      EXPORT: "Export CSV",
      FILTER: "Filter",
    },
    STATUS: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      RESOLVED: "Resolved",
      TRANSFERRED: "Transferred",
      MISSED: "Missed",
    }
  },
  SIDEBAR: {
    GROUPS: { MAIN: "MAIN", AI_SETTINGS: "AI SETTINGS", BUSINESS: "BUSINESS", SYSTEM: "SYSTEM" },
    LINKS: {
      DASHBOARD: "Dashboard", APPOINTMENTS: "Appointments", PATIENTS: "Patients",
      DOCTORS: "Doctors", CALL_LOGS: "Call Logs", AI_RECEPTIONIST: "AI Receptionist",
      KNOWLEDGE_BASE: "Knowledge Base", AI_CONVERSATIONS: "AI Conversations",
      SERVICES: "Services", INTEGRATIONS: "Integrations", ANALYTICS: "Analytics",
      NOTIFICATIONS: "Notifications", BILLING: "Billing", TEAM: "Team & Permissions",
      SETTINGS: "Settings",
    }
  },
  TABLES: {
    CALL_LOGS: {
      HEADERS: { CALLER: "Caller", DATE: "Date", TIME: "Time", DURATION: "Duration", INTENT: "Intent", AI_OUTCOME: "AI Outcome", STATUS: "Status" },
      MOCK_DATA: [
        { initials: 'RS', name: 'Rahul Sharma', date: 'Aug 12', time: '10:32', duration: '02:31', intent: 'Appointment Booking', outcome: 'Booked', status: 'Resolved' },
        { initials: 'EW', name: 'Emma Wilson', date: 'Aug 12', time: '10:05', duration: '01:12', intent: 'Pricing Question', outcome: 'Answered', status: 'Resolved' },
        { initials: 'UC', name: 'Unknown Caller', date: 'Aug 12', time: '09:45', duration: '03:02', intent: 'Appointment Request', outcome: 'Transferred', status: 'Transferred' },
        { initials: 'JC', name: 'James Chen', date: 'Aug 12', time: '09:15', duration: '01:45', intent: 'Service Inquiry', outcome: 'Answered', status: 'Resolved' },
        { initials: 'SA', name: 'Sophie Adams', date: 'Aug 11', time: '16:30', duration: '00:48', intent: 'Hours Question', outcome: 'Answered', status: 'Resolved' },
        { initials: 'LG', name: 'Lucas Garcia', date: 'Aug 11', time: '15:22', duration: '02:15', intent: 'Reschedule', outcome: 'Rescheduled', status: 'Resolved' },
        { initials: 'UC', name: 'Unknown Caller', date: 'Aug 11', time: '14:10', duration: '01:05', intent: 'General Question', outcome: 'Transferred', status: 'Transferred' },
        { initials: 'NM', name: 'Noah Martinez', date: 'Aug 11', time: '11:30', duration: '04:12', intent: 'Complaint', outcome: 'Escalated', status: 'Missed' }
      ]
    },
    PATIENTS: {
      HEADERS: { NAME: "Name", PHONE: "Phone", EMAIL: "Email", LAST_VISIT: "Last Visit", UPCOMING: "Upcoming", STATUS: "Status", ACTIONS: "Actions" },
      PAGINATION: { INFO: "Showing 1-8 of 42 patients", PREV: "Previous", NEXT: "Next" },
      MOCK_DATA: [
        { initials: 'RS', name: 'Rahul Sharma', phone: '+31 612 345 678', email: 'rahul@email.com', lastAppt: 'Aug 12, 2026', nextAppt: 'Aug 26, 2026', status: 'ACTIVE' },
        { initials: 'EW', name: 'Emma Wilson', phone: '+31 623 456 789', email: 'emma@email.com', lastAppt: 'Aug 11, 2026', nextAppt: 'Sep 1, 2026', status: 'ACTIVE' },
        { initials: 'JC', name: 'James Chen', phone: '+31 634 567 890', email: 'james@email.com', lastAppt: 'Aug 12, 2026', nextAppt: '-', status: 'ACTIVE' },
        { initials: 'SA', name: 'Sophie Adams', phone: '+31 645 678 901', email: 'sophie@email.com', lastAppt: 'Aug 10, 2026', nextAppt: 'Aug 19, 2026', status: 'ACTIVE' },
        { initials: 'LG', name: 'Lucas Garcia', phone: '+31 656 789 012', email: 'lucas@email.com', lastAppt: 'Aug 12, 2026', nextAppt: 'Aug 20, 2026', status: 'ACTIVE' },
        { initials: 'OB', name: 'Olivia Brown', phone: '+31 667 890 123', email: 'olivia@email.com', lastAppt: 'Jul 28, 2026', nextAppt: '-', status: 'INACTIVE' },
        { initials: 'NM', name: 'Noah Martinez', phone: '+31 678 901 234', email: 'noah@email.com', lastAppt: 'Aug 8, 2026', nextAppt: 'Aug 22, 2026', status: 'ACTIVE' },
        { initials: 'MJ', name: 'Mia Johnson', phone: '+31 689 012 345', email: 'mia@email.com', lastAppt: 'Aug 5, 2026', nextAppt: 'Sep 5, 2026', status: 'ACTIVE' }
      ]
    },
    CALL_STREAMS: {
      TITLE: "Recent AI Call Streams",
      VIEW_ALL: "View Call Logs",
      HEADERS: { CALLER: "Caller", TIME: "Time", INTENT: "Intent", DURATION: "Duration", OUTCOME: "Outcome" },
      MOCK_DATA: [
        { caller: 'Rahul Sharma', time: '10:32', intent: 'Appointment Booking', duration: '02:31', outcome: 'Booked' },
        { caller: 'Emma Wilson', time: '10:05', intent: 'Pricing Question', duration: '01:12', outcome: 'Resolved' },
        { caller: 'Unknown Caller', time: '09:45', intent: 'Appointment Request', duration: '03:02', outcome: 'Transferred' }
      ]
    },
    KNOWLEDGE: {
      TITLE: "Synced Knowledge Sources",
      HEADERS: { NAME: "Name", TYPE: "Type", STATUS: "Status", LAST_UPDATED: "Last Updated", ACTIONS: "Actions" },
      STATUS: { READY: "Ready", PROCESSING: "Processing" },
      ACTIONS: { EDIT: "Edit", REFRESH: "Refresh", DELETE: "Delete" },
      BUTTONS: { UPLOAD_DOC: "Upload Document", ADD_FAQ: "Add FAQ Entry" },
      MOCK_DATA: [
        { name: 'Pricing Guide.pdf', type: 'Document', status: 'Ready', date: 'Aug 10, 2026', icon: 'file' },
        { name: 'Business Policy.docx', type: 'Document', status: 'Ready', date: 'Aug 8, 2026', icon: 'file' },
        { name: 'Insurance FAQ.pdf', type: 'Document', status: 'Processing', date: 'Aug 12, 2026', icon: 'file' },
        { name: 'Service Catalog.pdf', type: 'Document', status: 'Ready', date: 'Aug 5, 2026', icon: 'file' },
        { name: 'www.smileclinic.com', type: 'Website', status: 'Ready', date: 'Aug 11, 2026', icon: 'globe' },
        { name: 'smileclinic.com/services', type: 'Website', status: 'Ready', date: 'Aug 11, 2026', icon: 'globe' },
        { name: 'Do you accept walk-ins?', type: 'FAQ', status: 'Ready', date: 'Aug 9, 2026', icon: 'file' },
        { name: 'What insurance do you accept?', type: 'FAQ', status: 'Ready', date: 'Aug 9, 2026', icon: 'file' },
        { name: 'What are your hours?', type: 'FAQ', status: 'Ready', date: 'Aug 7, 2026', icon: 'file' },
        { name: 'Cancellation Policy', type: 'Policy', status: 'Ready', date: 'Aug 6, 2026', icon: 'file' }
      ]
    },
    NOTIFICATIONS: {
      MOCK_DATA: [
        { id: 1, title: 'New appointment booked', description: 'AI booked an appointment for Rahul Sharma on Aug 12 at 09:30', time: '2 minutes ago', unread: true, iconType: 'appt', iconBg: 'bg-[#F0F7FF]', iconColor: 'text-[#0066FF]' },
        { id: 2, title: 'Call transferred', description: 'AI transferred a call to your receptionist. Caller requested to speak with a human.', time: '15 minutes ago', unread: true, iconType: 'transfer', iconBg: 'bg-[#F0F7FF]', iconColor: 'text-[#0066FF]' },
        { id: 3, title: 'Knowledge source processing', description: '2 documents are still being processed for your knowledge base.', time: '1 hour ago', unread: true, iconType: 'knowledge', iconBg: 'bg-[#FFFbeb]', iconColor: 'text-[#F59E0B]' },
        { id: 4, title: 'Google Calendar synced', description: 'Your calendar was successfully synced. 12 appointments updated.', time: '3 hours ago', unread: false, iconType: 'sync', iconBg: 'bg-[#F0F7FF]', iconColor: 'text-[#0066FF]' },
        { id: 5, title: 'Appointment completed', description: 'Emma Wilson completed her Dental Cleaning appointment with Dr. John Miller.', time: 'Yesterday', unread: false, iconType: 'check', iconBg: 'bg-[#E6FBF3]', iconColor: 'text-[#10B981]' },
        { id: 6, title: 'Integration needs attention', description: 'Google Calendar connection token expires in 3 days. Please reconnect.', time: 'Yesterday', unread: false, iconType: 'knowledge', iconBg: 'bg-[#FEF2F2]', iconColor: 'text-[#EF4444]' },
        { id: 7, title: 'Invoice generated', description: 'Your August invoice for Professional plan (€99) is ready.', time: '2 days ago', unread: false, iconType: 'invoice', iconBg: 'bg-gray-100', iconColor: 'text-gray-700' },
        { id: 8, title: 'New patient registered', description: 'James Chen was added as a new patient via AI conversation.', time: '2 days ago', unread: false, iconType: 'patient', iconBg: 'bg-[#F0F7FF]', iconColor: 'text-[#0066FF]' }
      ]
    },
    TEAM: {
      TITLE: "Clinic Team Members",
      HEADERS: { NAME: "Name", EMAIL: "Email", ROLE: "Role", STATUS: "Status", LAST_ACTIVE: "Last Active", ACTIONS: "Actions" },
      ACTIONS: { RESEND: "Resend", CANCEL: "Cancel", EDIT: "Edit", REMOVE: "Remove" },
      MOCK_DATA: [
        { id: 1, name: 'Dr. Sarah Wilson', email: 'sarah@smileclinic.com', initials: 'SW', role: 'OWNER', roleColor: 'bg-purple-50 text-purple-600', status: 'ACTIVE', statusColor: 'bg-[#E6FBF3] text-[#10B981]', lastActive: 'Just now', avatarBg: 'bg-[#F0F7FF]', avatarColor: 'text-[#0066FF]' },
        { id: 2, name: 'Dr. John Miller', email: 'john@smileclinic.com', initials: 'JM', role: 'ADMIN', roleColor: 'bg-blue-50 text-blue-600', status: 'ACTIVE', statusColor: 'bg-[#E6FBF3] text-[#10B981]', lastActive: '2 hours ago', avatarBg: 'bg-gray-100', avatarColor: 'text-gray-600' },
        { id: 3, name: 'Dr. Emily Carter', email: 'emily@smileclinic.com', initials: 'EC', role: 'DOCTOR', roleColor: 'bg-[#E6FBF3] text-[#10B981]', status: 'ON LEAVE', statusColor: 'bg-yellow-50 text-yellow-600', lastActive: '3 days ago', avatarBg: 'bg-gray-100', avatarColor: 'text-gray-600' },
        { id: 4, name: 'Lisa Park', email: 'lisa@smileclinic.com', initials: 'LP', role: 'RECEPTIONIST', roleColor: 'bg-gray-100 text-gray-600', status: 'ACTIVE', statusColor: 'bg-[#E6FBF3] text-[#10B981]', lastActive: '1 hour ago', avatarBg: 'bg-gray-100', avatarColor: 'text-gray-600' },
        { id: 5, name: 'Mark Thompson', email: 'mark@smileclinic.com', initials: 'MT', role: 'MANAGER', roleColor: 'bg-purple-50 text-purple-600', status: 'ACTIVE', statusColor: 'bg-[#E6FBF3] text-[#10B981]', lastActive: '5 hours ago', avatarBg: 'bg-gray-100', avatarColor: 'text-gray-600' },
        { id: 6, name: 'Anna Peters', email: 'anna@smileclinic.com', initials: 'AP', role: 'DOCTOR', roleColor: 'bg-[#E6FBF3] text-[#10B981]', status: 'INVITED', statusColor: 'bg-white border border-[#0066FF] text-[#0066FF]', lastActive: '—', avatarBg: 'bg-gray-100', avatarColor: 'text-gray-600' }
      ]
    }
  },
  INTEGRATIONS: {
    ACTIONS: { MANAGE: "Manage", CONFIGURE: "Configure", CONNECT: "Connect" },
    MOCK_DATA: [
      { id: 'google-calendar', name: 'Google Calendar', description: 'Automatically sync booked dental consult appointments.', status: 'Connected', action: 'Manage', iconColor: 'text-[#4285F4]', iconBg: 'bg-[#4285F4]/10', iconType: 'calendar' },
      { id: 'outlook', name: 'Outlook Calendar', description: 'Sync doctor shifts and clinic appointments with Outlook.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#0078D4]', iconBg: 'bg-[#0078D4]/10', iconType: 'calendar' },
      { id: 'google-meet', name: 'Google Meet', description: 'Host remote video dental consultations seamlessly.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#00AC47]', iconBg: 'bg-[#00AC47]/10', iconType: 'video' },
      { id: 'twilio', name: 'Twilio SMS', description: 'Send automated text message reminders and confirmations.', status: 'Connected', action: 'Manage', iconColor: 'text-[#F22F46]', iconBg: 'bg-[#F22F46]/10', iconType: 'sms' },
      { id: 'whatsapp', name: 'WhatsApp', description: 'Allow patient chat interactions directly via WhatsApp.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#25D366]', iconBg: 'bg-[#25D366]/10', iconType: 'whatsapp' },
      { id: 'stripe', name: 'Stripe', description: 'Collect online deposits and service copays instantly.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#635BFF]', iconBg: 'bg-[#635BFF]/10', iconType: 'payment' },
      { id: 'zoom', name: 'Zoom', description: 'Conduct video consults with integration links in invites.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#2D8CFF]', iconBg: 'bg-[#2D8CFF]/10', iconType: 'video' },
      { id: 'analytics', name: 'Google Analytics', description: 'Track user booking conversion funnels and marketing efficacy.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#F9AB00]', iconBg: 'bg-[#F9AB00]/10', iconType: 'analytics' },
      { id: 'zapier', name: 'Zapier', description: 'Connect dental records and invoices with 5,000+ app triggers.', status: 'Not connected', action: 'Connect', iconColor: 'text-[#FF4A00]', iconBg: 'bg-[#FF4A00]/10', iconType: 'zapier' },
      { id: 'developer', name: 'API & Webhooks', description: 'Generate API keys and configure webhooks to sync data with your internal systems.', status: 'Not connected', action: 'Configure', iconColor: 'text-gray-800', iconBg: 'bg-gray-100', iconType: 'developer' }
    ]
  },
  CONVERSATIONS_SIDEBAR: {
    TITLE: "Conversations",
    SEARCH_PLACEHOLDER: "Search callers...",
    FILTERS: ["All", "Resolved", "Transferred", "Unresolved"],
    MOCK_DATA: [
      { id: 1, name: 'Rahul Sharma', time: '10:32 AM', intent: 'Appointment Booking', status: 'Booked', message: '"I would like to book a dental consultation..."', active: true },
      { id: 2, name: 'Emma Wilson', time: '10:05 AM', intent: 'Pricing Question', status: 'Resolved', message: '"What is the average cost for dental clean..."', active: false },
      { id: 3, name: 'Unknown Caller', time: '9:45 AM', intent: 'Appointment Request', status: 'Transferred', message: '"Transferred to receptionist desk manually..."', active: false },
      { id: 4, name: 'James Chen', time: '9:15 AM', intent: 'Service Inquiry', status: 'Resolved', message: '"Do you provide weekend dental whiteni..."', active: false },
      { id: 5, name: 'Sophie Adams', time: 'Yesterday', intent: 'Hours Question', status: 'Resolved', message: '"What are your opening hours on Friday?"', active: false },
      { id: 6, name: 'Lucas Garcia', time: 'Yesterday', intent: 'Reschedule', status: 'Resolved', message: '"I need to push back my clinical appointment..."', active: false }
    ]
  },
  DASHBOARD_PANELS: {
    AI_VOLUME: {
      TITLE: "Calls Volume Trend (Last 7 Days)"
    },
    ANALYTICS: {
      BUSIEST_HOURS: "Busiest Calling Hours",
      CALL_OUTCOMES: "Call Outcomes",
      RESOLVED_AI: "Resolved by AI",
      APPOINTMENT_BOOKED: "Appointment Booked",
      TRANSFERRED: "Transferred to Desk",
      MISSED: "Missed / Abandoned"
    },
    APPOINTMENT_DETAIL: {
      TITLE: "Appointment Detail",
      SERVICE: "Service",
      DOCTOR: "Doctor",
      TIME: "Time",
      DURATION: "Duration",
      STATUS: "Status",
      SOURCE: "Source",
      NOTES: "Notes",
      BUTTONS: { MARK_COMPLETED: "Mark Completed", CONFIRM: "Confirm", RESCHEDULE: "Reschedule", CANCEL: "Cancel Appointment" }
    },
    CALL_DETAIL: {
      TITLE: "Call Detail",
      SUMMARY: "Call Summary",
      TRANSCRIPT: "Conversation Transcript",
      BUTTONS: { PLAY_RECORDING: "Play Recording", DOWNLOAD_TRANSCRIPT: "Download Transcript (PDF)" }
    },
    CONVERSATION_THREAD: {
      MOCK_DATA: {
        HEADER: {
          NAME: "Rahul Sharma",
          PHONE: "+31 6 1234 5678",
          DURATION: "Duration: 02:31",
          TAGS: ["Appointment Booking", "Booked"]
        },
        MESSAGES: [
          { sender: "AI RECEPTIONIST", time: "10:32 AM", text: "Hi, welcome to Smile Dental Clinic. How can I help you today?", isAI: true },
          { sender: "RAHUL SHARMA", time: "10:32 AM", text: "I would like to book a dental consultation.", isAI: false },
          { sender: "AI RECEPTIONIST", time: "10:33 AM", text: "I have an opening with Dr. Sarah Wilson at 9:30 AM tomorrow. Shall I book that?", isAI: true },
          { sender: "RAHUL SHARMA", time: "10:33 AM", text: "Yes please.", isAI: false },
          { sender: "AI RECEPTIONIST", time: "10:34 AM", text: "Done! Your appointment is booked. Anything else?", isAI: true }
        ]
      }
    },
    APPOINTMENTS: {
      TITLE: "Today's Appointments",
      VIEW_ALL: "View All Appointments",
      STATUS: { CONFIRMED: "Confirmed", PENDING: "Pending" },
      HEADERS: { PATIENT: "Patient", SERVICE: "Service", PROVIDER: "Provider", DATE: "Date", TIME: "Time", STATUS: "Status", SOURCE: "Source" },
      MOCK_DATA: [
        { time: '09:30', patient: 'Rahul Sharma', service: 'Consultation', doctor: 'Dr. Sarah', status: 'Confirmed', source: 'AI' },
        { time: '10:30', patient: 'Emma Wilson', service: 'Dental Cleaning', doctor: 'Dr. John', status: 'Pending', source: 'Website' },
        { time: '11:00', patient: 'James Chen', service: 'Teeth Whitening', doctor: 'Dr. Emily', status: 'Confirmed', source: 'AI' },
        { time: '14:00', patient: 'Sophie Adams', service: 'Root Canal', doctor: 'Dr. Sarah', status: 'Confirmed', source: 'Phone' },
        { time: '15:30', patient: 'Lucas Garcia', service: 'Dental X-Ray', doctor: 'Dr. John', status: 'Pending', source: 'AI' }
      ]
    }
  },
  HEADERS: {
    CALL_LOGS: { TITLE: "Call Logs", SUBTITLE: "Review and analyze recent AI interactions." },
    PATIENTS: { TITLE: "Patients Directory", SUBTITLE: "Manage patient records and history." },
    APPOINTMENTS: { TITLE: "Appointments", SUBTITLE: "View and manage upcoming schedules." }
  },
  ONBOARDING: {
    SUCCESS: {
      TITLE: "Your AI Receptionist is ready!",
      SUBTITLE: "Smile Dental Clinic is configured and ready for testing. Sarah is now on standby to manage appointments, call routing, and patient inquiries.",
      TEST_BTN: "Test AI Receptionist",
      DASHBOARD_BTN: "Go to Dashboard",
    },
    STAFF: {
      TITLE: "Add your team",
      SUBTITLE: "Introduce your practitioners and front-desk staff. The AI receptionist will cross-reference calendar configurations to schedule treatments only with qualified staff.",
      ASSIGNED_TREATMENTS: "Assigned Treatments",
      ADD_TEAM_MEMBER: "Add Team Member",
      ADD_TEAM_MEMBER_SUBTITLE: "Set up custom provider profiles, hours and treatments",
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    LAYOUT: {
      SAVE_LATER: "Save & Continue Later"
    },
    BUSINESS: {
      TITLE: "Tell us about your business",
      SUBTITLE: "Provide your core practice details. This helps our AI align with your clinic operations.",
      FIELDS: {
        NAME: "Business Name",
        COUNTRY: "Country",
        TYPE: "Business Type",
        ADDRESS: "Address",
        WEBSITE: "Website",
        CITY: "City",
        EMAIL: "Business Email",
        POSTAL_CODE: "Postal Code",
        PHONE: "Business Phone",
        TIMEZONE: "Timezone"
      },
      UPLOAD_LOGO: "Upload Business Logo",
      UPLOAD_DRAG: "Drag and drop or click to upload",
      UPLOAD_HINT: "PNG, JPG up to 5MB. Recommended square format.",
      ERROR_REQUIRED: "Please fill out all required fields.",
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    HOURS: {
      TITLE: "Set your business hours",
      SUBTITLE: "Configure your standard operating schedule. Aira receptionist will only book patient appointments during active hours.",
      DAY_HEADER: "Day",
      TIME_RANGES_HEADER: "Operating Time Ranges",
      TO: "to",
      ADD_BREAK: "Add break / block",
      CLOSED: "Closed all day",
      HOLIDAYS_TITLE: "Holidays & Special Closures",
      HOLIDAYS_SUBTITLE: "Define custom calendar exclusions, national holidays, or seasonal clinics lockouts.",
      ADD_HOLIDAY: "Add Holiday Closure",
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    SERVICES: {
      TITLE: "What services do you offer?",
      SUBTITLE: "Configure your treatment menu. Our AI receptionist uses this list to schedule correct durations and quote transparent prices on the call.",
      ADD_SERVICE: "Add New Service",
      ADD_SERVICE_SUBTITLE: "Create another dental, medical or cleaning treatment",
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    AI_RECEPTIONIST: {
      TITLE: "Configure your AI receptionist",
      SUBTITLE: "Sarah is your practice's virtual front-desk assistant. Customize how she speaks, who she transfers to, and what she can assist patients with.",
      ERROR_REQUIRED: "Please provide an AI Receptionist Name and a Greeting Statement.",
      FIELDS: {
        NAME: "AI Receptionist Name",
        GREETING: "Greeting Statement",
        PERSONALITY: "Personality Type",
        LANGUAGES: "Supported Languages",
        CAPABILITIES: "AI Actions & Capabilities",
        TRANSFER_PHONE: "Human Transfer Phone Number",
        ESCALATION: "Escalation Behavior"
      },
      ESCALATION_OPTIONS: {
        ASK_HUMAN: "When patient asks for a human",
        EMERGENCY: "Only on emergency keywords",
        ALWAYS_AI: "Always attempt AI resolution first"
      },
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    INTEGRATIONS: {
      TITLE: "Connect your tools",
      SUBTITLE: "Sync Aira with calendars, channels, and payment systems to establish a fully-automated modern practice pipeline.",
      STATUS_CONNECTED: "Connected",
      BTN_MANAGE: "Manage",
      BTN_CONNECT: "Connect",
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    KNOWLEDGE: {
      TITLE: "Teach your AI about your business",
      SUBTITLE: "Equip your AI receptionist with knowledge. Upload manuals, link websites, and specify custom FAQs so Sarah has context-perfect answers.",
      SECTION_DOCS: {
        TITLE: "1. Upload Business Documents",
        DESC: "Upload billing policies, patient guidelines, or price sheets.",
        DRAG_DROP: "Drag and drop files or click to browse",
        HINT: "PDF, DOCX, TXT supported (Max 10MB per file)",
        UPDATED: "Updated 2 mins ago",
        STATUS_READY: "Ready",
        STATUS_PROCESSING: "Processing"
      },
      SECTION_WEBSITE: {
        TITLE: "2. Sync with Business Website",
        DESC: "Sarah can automatically crawl pages on your website to stay updated on clinic info.",
        ADD_URL: "Add URL"
      },
      SECTION_FAQ: {
        TITLE: "3. Custom FAQ Responses",
        DESC: "Explicit answers for common scenarios. These always take precedence over AI default reasoning.",
        ADD_FAQ: "Add Custom FAQ",
        Q_PREFIX: "Q: ",
        A_PREFIX: "A: "
      },
      BACK_BTN: "Back",
      CONTINUE_BTN: "Continue"
    },
    REVIEW: {
      TITLE: "Review your setup",
      SUBTITLE: "Confirm your practice configuration below. Your AI receptionist will begin handling calls according to these parameters.",
      SECTIONS: {
        BUSINESS: {
          TITLE: "Business Details",
          PRACTICE_NAME: "Practice Name",
          TYPE: "Type",
          LOCATION: "Location"
        },
        HOURS: {
          TITLE: "Business Hours",
          MON_FRI: "Mon - Fri",
          SAT: "Sat",
          SUN: "Sun",
          CLOSED: "Closed"
        },
        SERVICES: {
          TITLE: "Configured Services"
        },
        TEAM: {
          TITLE: "Clinical Team"
        },
        AI: {
          TITLE: "AI Receptionist",
          AGENT_NAME: "Agent Name",
          LANGUAGES: "Languages",
          CAPABILITIES: "Enabled Capabilities"
        },
        KNOWLEDGE: {
          TITLE: "Knowledge Base",
          DOCS: "Documents",
          WEBSITES: "Websites Scraped",
          FAQS: "Configured FAQs"
        },
        INTEGRATIONS: {
          TITLE: "Integrations Connected",
          CONNECTED: "Connected"
        }
      },
      EDIT_BTN: "Edit",
      BACK_BTN: "Back",
      FINISH_BTN: "Finish Setup"
    }
  },
  PAGES: {
    DASHBOARD: {
      GREETING: "Good morning, Sarah",
      SUBTITLE: "Here is what is happening at Smile Dental Clinic today."
    }
  },
  DASHBOARD: {
    SETTINGS: {
      TITLE: "Settings",
      SUBTITLE: "Configure your workspace settings, integrations, and default configurations.",
      DATE_PLACEHOLDER: "Tuesday, August 12, 2026",
      SIDEBAR: {
        TABS: {
          BUSINESS: "Business",
          PROFILE: "Profile",
          SECURITY: "Security",
          NOTIFICATIONS: "Notifications",
          AI_DEFAULTS: "AI Defaults",
          BILLING: "Billing",
          DANGER_ZONE: "Danger Zone"
        }
      },
      PROFILE: {
        TITLE: "Personal Information",
        UPLOAD: "Upload New",
        REMOVE: "Remove",
        SUPPORTED_FORMATS: "Supports PNG or JPEG, max size 2MB.",
        FIRST_NAME: "First Name",
        LAST_NAME: "Last Name",
        EMAIL: "Email Address",
        SAVE: "Save Profile"
      },
      SECURITY: {
        CHANGE_PASSWORD: {
          TITLE: "Change Password",
          DESCRIPTION: "Ensure your account is using a long, random password to stay secure.",
          CURRENT: "Current Password",
          NEW: "New Password",
          CONFIRM: "Confirm New Password",
          UPDATE: "Update Password"
        },
        TFA: {
          TITLE: "Two-Factor Authentication (2FA)",
          DESCRIPTION: "Add additional security to your account using two-factor authentication.",
          ENABLE: "Enable 2FA"
        }
      },
      NOTIFICATIONS: {
        TITLE: "Notification Preferences",
        DESCRIPTION: "Choose how you want to be notified about activity in your clinic.",
        GROUPS: {
          APPOINTMENTS: {
            TITLE: "Appointments & Patients",
            EMAIL_TITLE: "Email Notifications",
            EMAIL_DESC: "Receive an email when an appointment is booked or canceled.",
            PUSH_TITLE: "Push Notifications",
            PUSH_DESC: "Receive a push notification on your devices."
          },
          AI_ACTIVITY: {
            TITLE: "AI Receptionist Activity",
            EMAIL_TITLE: "Email Notifications",
            EMAIL_DESC: "Daily summaries of AI call logs and escalations.",
            PUSH_TITLE: "Push Notifications",
            PUSH_DESC: "Immediate alerts when the AI transfers a call to a human."
          },
          BILLING: {
            TITLE: "Billing & Account",
            EMAIL_TITLE: "Email Notifications",
            EMAIL_DESC: "Invoices, receipts, and plan changes."
          }
        }
      },
      AI_DEFAULTS: {
        TITLE: "Global AI Defaults",
        DESCRIPTION: "Configure the baseline behavior for your AI receptionist.",
        VOICE: {
          LABEL: "Default Voice Identity",
          OPTIONS: [
            "Rachel (Friendly, Professional, Female)",
            "Marcus (Deep, Reassuring, Male)",
            "Sarah (Energetic, Clear, Female)"
          ],
          HINT: "This is the default voice for all incoming calls."
        },
        SPEED: {
          LABEL: "Speaking Rate (Speed)",
          SLOW: "Slow",
          FAST: "Fast",
          HINT: "Adjust how fast the AI speaks."
        },
        LANGUAGE: {
          LABEL: "Fallback Language",
          OPTIONS: ["English (US)", "Dutch", "Spanish", "French"],
          HINT: "If the AI fails to detect the caller's language, it will fallback to this."
        },
        SAVE: "Save AI Settings"
      }
    },
    TEAM: {
      INVITE_BTN: "+ Invite Member"
    },
    HEADERS: {
      AI: {
        TITLE: "AI Receptionist",
        SUBTITLE: "Configure call routing behavior, AI persona, and check agent performance",
        STATUS_ONLINE: "AI ONLINE",
        BTN_TEST: "Test AI",
        BTN_PAUSE: "Pause AI"
      },
      ANALYTICS: {
        TITLE: "Analytics",
        SUBTITLE: "Understand your clinic calling volume and performance metrics",
        FILTERS: {
          TODAY: "Today",
          DAYS_7: "7 Days",
          DAYS_30: "30 Days",
          DAYS_90: "90 Days",
          CUSTOM: "Custom"
        },
        BTN_EXPORT: "Export Report"
      },
      APPOINTMENTS_FILTER: {
        LABELS: {
          DOCTOR: "Doctor",
          SERVICE: "Service",
          STATUS: "Status",
          SOURCE: "Source"
        },
        OPTIONS: {
          ALL_DOCTORS: "All Doctors",
          ALL_SERVICES: "All Services",
          ALL_STATUSES: "All Statuses",
          ALL_SOURCES: "All Sources"
        },
        VIEWS: {
          WEEK: "Week Calendar",
          LIST: "List View"
        }
      },
      BILLING: {
        TITLE: "Billing & Subscription",
        SUBTITLE: "Manage your plan, metrics usage, and payment methods"
      },
      CALL_LOGS_FILTER: {
        LABELS: {
          STATUS: "Status",
          INTENT: "Intent"
        },
        OPTIONS: {
          ALL_STATUSES: "All Statuses",
          ALL_INTENTS: "All Intents"
        },
        SEARCH_PLACEHOLDER: "Search callers..."
      },
      CONVERSATIONS: {
        TITLE: "AI Conversations",
        SUBTITLE: "Review incoming automated voice and chat transcript records."
      },
      DOCTORS: {
        TITLE: "Doctors & Staff",
        SUBTITLE: "Manage internal clinic staff roles, scheduling limits, and capabilities.",
        ADD_BTN: "Add Staff / Doctor"
      },
      INTEGRATIONS: {
        TITLE: "Integrations",
        SUBTITLE: "Connect external services to sync calendar, billing, and clinical communication tools.",
        TABS: {
          ALL: "All Integrations",
          CALENDAR: "Calendar",
          COMMUNICATION: "Communication",
          PAYMENTS: "Payments",
          DEVELOPER: "Developer"
        }
      },
      KNOWLEDGE: {
        TITLE: "Knowledge Base",
        SUBTITLE: "Manage documents, clinical policies, and web portals used by the AI agent",
        SEARCH_PLACEHOLDER: "Search files...",
        ADD_BTN: "Add Source"
      },
      NOTIFICATIONS: {
        TITLE: "Notifications",
        SUBTITLE: "Stay updated with clinic activities, bookings, and alerts",
        MARK_READ: "Mark all as read",
        FILTERS: {
          ALL: "All",
          APPOINTMENTS: "Appointments",
          AI: "AI",
          INTEGRATION: "Integration",
          SYSTEM: "System",
          BILLING: "Billing"
        }
      },
      PATIENTS_FILTER: {
        SEARCH_PLACEHOLDER: "Search patients...",
        FILTERS: {
          ALL: "All Patients",
          ACTIVE: "Active",
          INACTIVE: "Inactive"
        },
        ADD_BTN: "Add Patient"
      },
      SERVICES: {
        TITLE: "Services",
        SUBTITLE: "Configure dental services handled by your clinic's AI Receptionist.",
        ADD_BTN: "Add Service"
      },
      TEAM: {
        TITLE: "Team & Permissions",
        SUBTITLE: "Manage your clinic's team members and their permission levels."
      }
    },
    COMPONENTS: {
        AI_BANNER: {
          STATUS: "AI ONLINE",
          STATUS_TEXT: "Sarah is active",
          DESCRIPTION: "Sarah is handling calls for your clinic. Current performance is highly optimal.",
          STATS: {
            CALLS: "Calls Handled Today",
            APPOINTMENTS: "Appointments Booked",
            RESOLUTION: "AI Resolution Rate"
          },
          BTN_TEST: "Test Receptionist",
          BTN_CONFIGURE: "Configure"
        },
        AI_KPI_CARDS: [
          { title: 'Calls Handled', value: '1,247', subtext: '37 processed today' },
          { title: 'Appointments Booked', value: '342', subtext: '8 confirmed today' },
          { title: 'AI Resolution Rate', value: '84%', subtext: '↑ 3% since last week' },
          { title: 'Avg Call Duration', value: '02:15', subtext: 'Highly optimal sync' }
        ],
        AI_OPERATIONS: {
          TITLE: "Recent Active Operations",
          LIST: [
            { time: '10:32 AM', title: 'Rahul Sharma: Booked Consultation with Dr. Sarah' },
            { time: '10:05 AM', title: 'Answered inquiry regarding cosmetic dentistry prices' },
            { time: '09:45 AM', title: 'Transferred emergency dental pain call to reception' }
          ]
        },
        AI_TABS: {
          OVERVIEW: 'Overview',
          BEHAVIOR: 'Behavior',
          VOICE: 'Voice',
          LANGUAGES: 'Languages',
          CALL_HANDLING: 'Call Handling',
          APPOINTMENTS: 'Appointments',
          ESCALATION: 'Escalation'
        },
        ALERTS_CARD: {
          TITLE: "Critical Attention",
          ALERTS: {
            CALLS_TRANSFERRED: "3 calls transferred to front desk manually.",
            SYNC_WARNING_TITLE: "Calendar sync warning:",
            SYNC_WARNING_DESC: " Google Calendar connection needs refreshing.",
            KNOWLEDGE_PARSING: "2 knowledge sources currently parsing in background..."
          }
        },
        ANALYTICS_KPIS: [
          { label: 'Total Calls', value: '1,247', trend: '↑ 12% vs last month', isPositive: true },
          { label: 'AI Answer Rate', value: '92%', trend: '↑ 4% vs last month', isPositive: true },
          { label: 'AI Resolution Rate', value: '84%', trend: '↑ 8% vs last month', isPositive: true },
          { label: 'Appointments Booked', value: '342', trend: '↑ 23% vs last month', isPositive: true },
          { label: 'Conversion Rate', value: '27%', trend: '↑ 3% vs last month', isPositive: true },
          { label: 'Avg Call Duration', value: '02:15', trend: '↓ 14% vs last month', isPositive: true }
        ],
        CURRENT_PLAN_CARD: {
          LABEL: "Current Active Plan",
          TITLE: "Professional Plan",
          RENEWAL_TEXT: "Your plan renews on September 1, 2026.",
          STATS: {
            MINUTES_LABEL: "AI minutes used",
            MINUTES_VALUE: "850 / 1,000 minutes (85%)",
            CALLS_LABEL: "Calls processed",
            CALLS_VALUE: "2,100 / 5,000 calls (42%)"
          },
          BTN_CHANGE_PLAN: "Change Plan",
          BTN_MANAGE_BILLING: "Manage Billing"
        },
        DEVELOPER_SETTINGS: {
          API_KEYS: {
            TITLE: "API Keys",
            SUBTITLE: "Generate keys to authenticate your API requests.",
            GENERATE_BTN: "Generate New Key",
            TABLE: {
              COLS: ["Name", "Key", "Created", "Actions"],
              MOCK_DATA: {
                NAME: "Production App",
                KEY: "sk_live_...4f9a",
                CREATED: "Aug 10, 2026",
                REVOKE: "Revoke"
              }
            }
          },
          WEBHOOKS: {
            TITLE: "Webhooks",
            SUBTITLE: "Receive real-time HTTP POST payloads when events occur.",
            ENDPOINT_LABEL: "Endpoint URL",
            EVENTS_LABEL: "Events to send",
            EVENTS: ["appointment.created", "patient.created", "call.completed"],
            SAVE_BTN: "Save Webhook"
          }
        },
        INSIGHTS_CARD: {
          TITLE: "AI Insights & Health",
          INSIGHTS: [
            "Peak calling volume detected between 10:00 - 11:30 AM today.",
            "Frequent inquiries about 'Teeth Whitening costs' resolved by Sarah.",
            "AI accuracy is solid at 84%, with 0 missed critical emergencies."
          ]
        },
        INVOICE_HISTORY: {
          TITLE: "Invoice History",
          TABLE: {
            COLS: ["Date", "Description", "Amount", "Status", "Action"],
            DOWNLOAD_BTN: "Download",
            MOCK_DATA: [
              { date: 'Aug 1, 2026', description: 'Professional Plan Subscription', amount: '€99.00', status: 'Paid' },
              { date: 'Jul 1, 2026', description: 'Professional Plan Subscription', amount: '€99.00', status: 'Paid' },
              { date: 'Jun 1, 2026', description: 'Professional Plan Subscription', amount: '€99.00', status: 'Paid' }
            ]
          }
        },
        KNOWLEDGE_STATS: [
          { title: 'Documents', subtext: '4 sources' },
          { title: 'Website Syncs', subtext: '2 sources' },
          { title: 'FAQs', subtext: '12 entries' },
          { title: 'Clinic Policies', subtext: '3 sources' }
        ],
        AI_TABS_CONTENT: {
          APPOINTMENTS: {
            TITLE: "Appointment Scheduling",
            DESCRIPTION: "Set constraints and rules for how the AI interacts with your calendar.",
            STATUS: {
              TITLE: "Google Calendar Linked",
              SUBTITLE: "Synced 2 minutes ago",
              BTN: "Manage Sync"
            },
            LIMITS: {
              BUFFER: "Minimum Buffer (Minutes)",
              BUFFER_HINT: "Time gap required between back-to-back bookings.",
              NOTICE: "Advance Notice (Hours)",
              NOTICE_HINT: "How far in advance a booking must be made."
            },
            TOGGLES: {
              CANCEL: "Allow Cancellations",
              CANCEL_HINT: "Callers can cancel their existing appointments via AI.",
              RESCHEDULE: "Allow Rescheduling",
              RESCHEDULE_HINT: "Callers can shift their existing appointments to a new slot."
            },
            SAVE: "Save Appointments Rules"
          },
          BEHAVIOR: {
            TITLE: "AI Persona & Behavior",
            DESCRIPTION: "Define how the AI Receptionist should act, talk, and process logic.",
            PROMPT: {
              LABEL: "System Prompt / Instructions",
              PLACEHOLDER: "You are Sarah, the friendly receptionist at Smile Dental Clinic. Your goal is to...",
              DEFAULT: "You are Sarah, the friendly receptionist at Smile Dental Clinic. Your goal is to answer patient inquiries politely, check doctor availability, and book appointments. Never provide medical advice.",
              HINT: "These instructions form the core personality and strict rules of the AI."
            },
            TEMP: {
              LABEL: "Adherence vs Creativity (Temperature)",
              STRICT: "Strict Script (0)",
              CREATIVE: "Creative / Chatty (1)"
            },
            TOGGLES: {
              SMALL_TALK: "Allow Small Talk",
              SMALL_TALK_HINT: "Allow the AI to engage in friendly banter before getting to business.",
              CONFIRM: "Force Action Confirmation",
              CONFIRM_HINT: 'AI will always ask "Should I go ahead and book this?" before finalizing.'
            },
            SAVE: "Save Behavior Settings"
          },
          CALL_HANDLING: {
            TITLE: "Call Handling Rules",
            DESCRIPTION: "Define how inbound and outbound calls are initiated and constrained.",
            PHONE_NUMBER: {
              TITLE: "AI Phone Number",
              STATUS_PENDING: "Not set up yet",
              STATUS_ACTIVE: "Call forwarding active",
              FORWARD_TITLE: "Forward your existing number (start here)",
              FORWARD_DESCRIPTION: "Keep your current clinic number. Forward it to your AI's number below to go live — no new number to give out yet.",
              FORWARD_HINT: "Ask your phone carrier or check your PBX/VoIP dashboard for how to set up call forwarding to this number.",
              COPY_BTN: "Copy Number",
              DEDICATED_TITLE: "Get a dedicated AI number (optional, later)",
              DEDICATED_DESCRIPTION: "Once you're ready, request a number you can advertise directly as your AI receptionist's own line.",
              DEDICATED_BTN: "Request a Number"
            },
            GREETING: {
              LABEL: "Default Inbound Greeting",
              PLACEHOLDER: "Hello! Thank you for calling Smile Dental Clinic. How can I assist you today?",
              DEFAULT: "Hello! Thank you for calling Smile Dental Clinic. I'm Sarah, the virtual assistant. How can I assist you today?",
              HINT: "The exact first words spoken by the AI when a call connects."
            },
            TOGGLES: {
              RECORD: "Record Calls",
              RECORD_HINT: "Keep audio recordings of all AI conversations.",
              TRANSCRIBE: "Transcribe Calls",
              TRANSCRIBE_HINT: "Generate and save text transcripts for all calls."
            },
            LIMITS: {
              MAX_DURATION: "Max Call Duration (Minutes)",
              SILENT_TIMEOUT: "Silent Timeout (Seconds)",
              SILENT_HINT: "Hang up if caller is silent for this long."
            },
            SAVE: "Save Call Settings"
          },
          ESCALATION: {
            TITLE: "Escalation & Guardrails",
            DESCRIPTION: "Define when and where the AI should abandon the call and transfer to a human.",
            FALLBACK: {
              LABEL: "Fallback Phone Number",
              HINT: "When an escalation is triggered, the caller will be routed here immediately."
            },
            TRIGGERS_LABEL: "Escalation Triggers",
            TRIGGERS: [
              { id: 'angry', label: 'Caller expresses intense frustration or anger', active: true },
              { id: 'emergency', label: 'Caller uses emergency keywords (pain, hospital, police)', active: true },
              { id: 'looping', label: 'AI fails to answer the same question twice in a row', active: true },
              { id: 'billing', label: 'Caller requests complex billing or refund assistance', active: false },
              { id: 'manager', label: 'Caller explicitly asks to "speak to a manager or human"', active: true },
            ],
            SAVE: "Save Escalation Rules"
          },
          LANGUAGES: {
            TITLE: "Language Capabilities",
            DESCRIPTION: "Configure the languages your AI receptionist can speak and understand.",
            PRIMARY: {
              LABEL: "Primary Language",
              HINT: "The AI will default to this language when a call starts."
            },
            AUTO_DETECT: {
              LABEL: "Auto-Detect Caller Language",
              HINT: "If the caller speaks in a supported language, automatically switch."
            },
            SUPPORTED: {
              LABEL: "Supported Languages",
              OPTIONS: [
                { code: 'en', name: 'English (US)', active: true },
                { code: 'es', name: 'Spanish', active: true },
                { code: 'fr', name: 'French', active: false },
                { code: 'de', name: 'German', active: false },
                { code: 'hi', name: 'Hindi', active: false },
                { code: 'zh', name: 'Mandarin', active: false },
              ]
            },
            SAVE: "Save Language Settings"
          },
          VOICE: {
            TITLE: "Voice & TTS Configuration",
            DESCRIPTION: "Select the voice engine and persona for your AI Receptionist.",
            ENGINE: {
              LABEL: "Primary TTS Engine",
              ELEVEN_LABS: "ElevenLabs (High Quality)",
              CARTESIA: "Cartesia (Ultra Low Latency)"
            },
            VOICE: {
              LABEL: "Voice Persona",
              OPTIONS: [
                { id: 'sarah', name: 'Sarah', type: 'Warm Female', provider: 'ElevenLabs', active: true },
                { id: 'marcus', name: 'Marcus', type: 'Professional Male', provider: 'Cartesia', active: false },
                { id: 'emma', name: 'Emma', type: 'Young Female', provider: 'ElevenLabs', active: false },
                { id: 'james', name: 'James', type: 'Deep Male', provider: 'ElevenLabs', active: false },
              ]
            },
            SLIDERS: {
              SPEED: "Speaking Speed",
              SPEED_SLOW: "Slow",
              SPEED_NORM: "1.0x",
              SPEED_FAST: "Fast",
              PITCH: "Pitch Correction",
              PITCH_LOW: "- 5",
              PITCH_NORM: "Default",
              PITCH_HIGH: "+ 5"
            },
            SAVE: "Save Voice Settings"
          }
        },
        APPOINTMENTS_TABLE: {
          TITLE: "Today's Appointments",
          VIEW_ALL: "View All",
          HEADERS: {
            TIME: "Time",
            PATIENT: "Patient",
            SERVICE: "Service",
            PROVIDER: "Provider",
            STATUS: "Status",
            SOURCE: "Source"
          },
          STATUS: {
            CONFIRMED: "Confirmed",
            PENDING: "Pending"
          },
          MOCK_DATA: [
            { time: '09:00 AM', patient: 'Rahul Sharma', service: 'Consultation', doctor: 'Dr. Sarah', status: 'Confirmed', source: 'AI' },
            { time: '10:30 AM', patient: 'Emma Wilson', service: 'Cleaning', doctor: 'Dr. John', status: 'Confirmed', source: 'AI' },
            { time: '11:15 AM', patient: 'Lucas Garcia', service: 'X-Ray', doctor: 'Dr. John', status: 'Pending', source: 'Manual' },
            { time: '01:00 PM', patient: 'Sophie Adams', service: 'Whitening', doctor: 'Dr. Emily', status: 'Confirmed', source: 'AI' }
          ]
        },
        PAYMENT_METHOD_CARD: {
          BADGE: "VISA",
          DETAILS: "Visa ending in 4242",
          EXPIRES: "Expires 12/28",
          UPDATE_BTN: "Update"
        },
        PRICING_TIERS: [
          {
            name: 'Starter', price: '€29/month', buttonText: 'Downgrade',
            features: ['100 AI minutes', '500 calls limit', '1 business access', '2 team members', 'Basic analytics']
          },
          {
            name: 'Professional', price: '€99/month', buttonText: 'Current Plan',
            features: ['1,000 AI minutes', '5,000 calls limit', '3 businesses access', '10 team members', 'Advanced analytics', 'Priority support']
          },
          {
            name: 'Business', price: '€249/month', buttonText: 'Upgrade',
            features: ['Unlimited AI minutes', 'Unlimited calls processed', 'Unlimited businesses', 'Unlimited team members', 'Custom analytics', 'Dedicated support', 'Custom integrations']
          }
        ],
        QUICK_ACTIONS: {
          TITLE: "Quick Actions",
          ACTIONS: ["+ Appt", "+ Patient", "+ Doctor", "+ Service"],
          BTN_CONFIGURE: "Configure AI Receptionist"
        },
        SERVICE_CARDS: {
          STATUS: {
            ACTIVE: "Active",
            INACTIVE: "Inactive"
          },
          MOCK_DATA: [
            { id: 1, title: 'Dental Consultation', description: 'Initial clinical patient checkup & treatment planning.', duration: '30 min', price: '€50', doctors: 'Dr. Sarah + Dr. Emily', status: 'Active' },
            { id: 2, title: 'Dental Cleaning', description: 'Routine scaling, polishing & oral health deep cleaning.', duration: '45 min', price: '€80', doctors: 'Dr. John', status: 'Active' },
            { id: 3, title: 'Teeth Whitening', description: 'Professional cosmetic laser smile whitening.', duration: '60 min', price: '€150', doctors: 'Dr. Emily', status: 'Active' },
            { id: 4, title: 'Root Canal', description: 'Specialist therapeutic endodontic procedure.', duration: '45 min', price: '€120', doctors: 'Dr. Sarah', status: 'Active' },
            { id: 5, title: 'Dental X-Ray', description: 'Diagnostic radiographic imaging of teeth structure.', duration: '15 min', price: '€35', doctors: 'Dr. John', status: 'Active' },
            { id: 6, title: 'Orthodontic Consultation', description: 'Assessment for braces, clear aligners & structural planning.', duration: '60 min', price: '€100', doctors: 'Dr. John', status: 'Inactive' }
          ]
        },
        STAFF_CARD: {
          ROLES: {
            DOCTOR: "Doctor",
            RECEPTIONIST: "Receptionist"
          },
          LABELS: {
            STATUS: "Status",
            WEEKLY_SCHEDULE: "Weekly Schedule",
            RATING: "Rating",
            CONTACT: "Contact",
            ASSIGNED_SERVICES: "Assigned Services"
          },
          BUTTONS: {
            VIEW_SCHEDULE: "View Schedule",
            EDIT: "Edit"
          }
        },
        TEST_PLAYGROUND: {
          TITLE: "AI Test Playground",
          SUBTITLE: "Simulate a call before publishing changes live. Nothing here affects real patients or bookings.",
          BADGE: "Test Mode — isolated from live calls",
          SCENARIOS_LABEL: "Test Scenario",
          SCENARIOS: [
            { id: 'booking', label: 'Book Appointment' },
            { id: 'reschedule', label: 'Reschedule' },
            { id: 'emergency', label: 'Emergency Keyword' },
            { id: 'faq', label: 'Pricing FAQ' },
          ],
          RUN_BTN: "Run Test Call",
          RUNNING_BTN: "Running Simulation...",
          RESET_BTN: "Reset",
          TRANSCRIPTS: {
            booking: [
              { speaker: 'AI', text: 'Good day, thank you for calling. I am your AI assistant. How may I help you today?' },
              { speaker: 'User', text: 'I would like to book a routine cleaning for next Tuesday morning.' },
              { speaker: 'AI', text: 'I have an opening at 10:00 AM on Tuesday. Shall I lock that in for you?' },
              { speaker: 'User', text: 'Yes please, that works.' },
              { speaker: 'AI', text: 'Booked! You will receive an SMS confirmation shortly.' },
            ],
            reschedule: [
              { speaker: 'AI', text: 'Hello, thank you for calling. How can I assist you?' },
              { speaker: 'User', text: 'I need to move my Thursday appointment to Friday afternoon.' },
              { speaker: 'AI', text: 'No problem, I have 3:30 PM open on Friday. Shall I update your booking?' },
              { speaker: 'User', text: 'Yes, thank you.' },
            ],
            emergency: [
              { speaker: 'AI', text: 'Hello, thank you for calling. How can I help you today?' },
              { speaker: 'User', text: 'I am in severe pain and need to be seen right now!' },
              { speaker: 'AI', text: 'I understand this is urgent. I am escalating you to our emergency line immediately.' },
            ],
            faq: [
              { speaker: 'AI', text: 'Hello, thank you for calling. How can I help you today?' },
              { speaker: 'User', text: 'What is the price for a teeth whitening session?' },
              { speaker: 'AI', text: 'Our teeth whitening session is priced at €150 and takes about 60 minutes.' },
            ],
          },
          CONFIG_TITLE: "Configuration Being Tested",
          CONFIG: {
            GREETING: "Greeting Message",
            VOICE: "Voice",
            KNOWLEDGE: "Knowledge Sources",
          },
          RESULTS_TITLE: "Test Evaluation",
          RESULTS: {
            booking: [
              { label: 'Correctly identified intent', pass: true },
              { label: 'Collected all required fields', pass: true },
              { label: 'Completed booking action', pass: true },
              { label: 'Response latency under 800ms', pass: true },
            ],
            reschedule: [
              { label: 'Correctly identified intent', pass: true },
              { label: 'Located existing appointment', pass: true },
              { label: 'Completed reschedule action', pass: true },
              { label: 'Response latency under 800ms', pass: true },
            ],
            emergency: [
              { label: 'Detected emergency keyword', pass: true },
              { label: 'Skipped normal booking flow', pass: true },
              { label: 'Escalated to human line', pass: true },
              { label: 'Response latency under 800ms', pass: false },
            ],
            faq: [
              { label: 'Correctly identified intent', pass: true },
              { label: 'Answered from knowledge base', pass: true },
              { label: 'No hallucinated pricing', pass: true },
              { label: 'Response latency under 800ms', pass: true },
            ],
          },
          CLOSE_BTN: "Close",
          SAVE_DRAFT_BTN: "Save as Draft",
          PUBLISH_BTN: "Looks Good — Publish Changes",
        },
        WEEKLY_CALENDAR: {
          DAYS: [
            { day: 'Mon', date: '10' },
            { day: 'Tue', date: '11' },
            { day: 'Wed', date: '12', active: true },
            { day: 'Thu', date: '13' },
            { day: 'Fri', date: '14' }
          ],
          HOURS: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
          EVENTS: {
            RAHUL_CONSULTATION: { name: "Rahul Sharma", type: "Consultation", doc: "Dr. Sarah" },
            JAMES_WHITENING: { name: "James Chen", type: "Whitening", doc: "Dr. Emily" },
            SOPHIE_WHITENING: { name: "Sophie Adams", type: "Whitening", doc: "Dr. Emily" },
            NOAH_CONSULTATION: { name: "Noah Martinez", type: "Consultation", doc: "Dr. Sarah" },
            EMMA_CLEANING: { name: "Emma Wilson", type: "Cleaning", doc: "Dr. John" },
            LUCAS_XRAY: { name: "Lucas Garcia", type: "X-Ray", doc: "Dr. John" },
            SOPHIE_ROOT_CANAL: { name: "Sophie Adams", type: "Root Canal", doc: "Dr. Sarah" }
          }
        }
      }
  }
};
