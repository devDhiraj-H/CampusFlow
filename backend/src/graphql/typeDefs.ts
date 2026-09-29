export const typeDefs = `#graphql
  enum TicketStatus {
    OPEN
    IN_PROGRESS
    RESOLVED
    CLOSED
  }

  enum TicketPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum TicketCategory {
    HOSTEL
    ACADEMIC
    MAINTENANCE
    FINANCE
    GENERAL
  }

  type Student {
    prn: String!
    auth_id: Int!
    name: String!
    email: String!
    department: String
    year: Int
    roll_no: String
    hosteller: Boolean!
    created_at: String!
  }

  type TicketComment {
    id: ID!
    ticket_id: ID!
    author_id: String!
    author_role: String!
    author_name: String
    comment: String!
    created_at: String!
  }

  type TicketActivity {
    id: ID!
    ticket_id: ID!
    actor: String!
    action: String!
    from_status: String
    to_status: String
    notes: String
    created_at: String!
  }

  type Ticket {
    id: ID!
    title: String!
    description: String!
    category: TicketCategory!
    priority: TicketPriority!
    status: TicketStatus!
    department_routing: String!
    sla_deadline: String!
    is_sla_breached: Boolean!
    created_by: String!
    assigned_to: String
    resolved_by: String
    resolved_at: String
    resolution_notes: String
    created_at: String!
    updated_at: String!
    comments: [TicketComment!]!
    timeline: [TicketActivity!]!
    creator: Student
  }

  type CategoryMetric {
    category: String!
    count: Int!
  }

  type PriorityMetric {
    priority: String!
    count: Int!
  }

  type TicketAnalytics {
    total: Int!
    open: Int!
    in_progress: Int!
    resolved: Int!
    closed: Int!
    sla_breached: Int!
    by_category: [CategoryMetric!]!
    by_priority: [PriorityMetric!]!
  }

  type TicketListResponse {
    total: Int!
    tickets: [Ticket!]!
  }

  type AuthUser {
    auth_id: Int!
    email: String!
    role: String!
    name: String
    prn: String
  }

  type AuthResponse {
    token: String!
    user: AuthUser!
  }

  type RegisterResponse {
    auth_id: Int!
    prn: String!
    name: String!
    email: String!
  }

  input CreateTicketInput {
    title: String!
    description: String!
    category: TicketCategory
    priority: TicketPriority
  }

  input RegisterStudentInput {
    prn: String!
    name: String!
    email: String!
    password: String!
    department: String
    year: Int
    roll_no: String
    hosteller: Boolean
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    # Current authenticated user
    me: AuthUser

    # Student operations
    studentProfile(prn: String!): Student
    students(department: String): [Student!]!

    # Ticket operations
    ticket(id: ID!): Ticket
    tickets(
      status: TicketStatus
      category: TicketCategory
      department_routing: String
      created_by: String
      assigned_to: String
      sla_breached: Boolean
      limit: Int
      offset: Int
    ): TicketListResponse!

    # Operational metrics
    ticketAnalytics: TicketAnalytics!
  }

  type Mutation {
    # Authentication
    registerStudent(input: RegisterStudentInput!): RegisterResponse!
    login(input: LoginInput!): AuthResponse!

    # Ticket operations
    createTicket(input: CreateTicketInput!): Ticket!
    updateTicketStatus(id: ID!, status: TicketStatus!, notes: String): Ticket!
    assignTicket(id: ID!, assignedTo: String!, notes: String): Ticket!
    addComment(ticketId: ID!, comment: String!): TicketComment!
    deleteTicket(id: ID!): Boolean!
  }
`;
