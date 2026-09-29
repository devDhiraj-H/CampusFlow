/**
 * CampusFlow API Client
 * Interfaces with the GraphQL Gateway (/graphql) and Express Health Probes (/health)
 */

const TOKEN_KEY = 'campusflow_jwt_token';
const USER_KEY = 'campusflow_user_data';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function gqlRequest(query, variables = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors && result.errors.length > 0) {
    const primaryError = result.errors[0];
    const message = primaryError.message || 'GraphQL Query failed';
    const errorObj = new Error(message);
    errorObj.extensions = primaryError.extensions;
    throw errorObj;
  }
  return result.data;
}

export async function fetchSystemHealth() {
  try {
    const res = await fetch('/health');
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      service: 'campusflow-core',
      database: 'disconnected',
      error: err.message,
    };
  }
}

// ----------------- Auth Operations -----------------

export async function loginUser(email, password) {
  const query = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user {
          auth_id
          email
          role
          name
          prn
        }
      }
    }
  `;
  const data = await gqlRequest(query, { input: { email, password } });
  const { token, user } = data.login;
  setSession(token, user);
  return user;
}

export async function registerStudentUser(studentData) {
  const query = `
    mutation Register($input: RegisterStudentInput!) {
      registerStudent(input: $input) {
        auth_id
        prn
        name
        email
      }
    }
  `;
  const data = await gqlRequest(query, { input: studentData });
  return data.registerStudent;
}

export async function fetchMe() {
  const query = `
    query Me {
      me {
        auth_id
        email
        role
        name
        prn
      }
    }
  `;
  const data = await gqlRequest(query);
  return data.me;
}

// ----------------- Ticket Operations -----------------

export async function fetchTickets(filters = {}) {
  const query = `
    query GetTickets(
      $status: TicketStatus,
      $category: TicketCategory,
      $department_routing: String,
      $created_by: String,
      $assigned_to: String,
      $limit: Int
    ) {
      tickets(
        status: $status,
        category: $category,
        department_routing: $department_routing,
        created_by: $created_by,
        assigned_to: $assigned_to,
        limit: $limit
      ) {
        total
        tickets {
          id
          title
          description
          category
          priority
          status
          department_routing
          sla_deadline
          is_sla_breached
          created_by
          assigned_to
          resolved_by
          created_at
          comments {
            id
          }
        }
      }
    }
  `;
  const data = await gqlRequest(query, filters);
  return data.tickets;
}

export async function fetchTicketDetails(id) {
  const query = `
    query GetTicketDetails($id: ID!) {
      ticket(id: $id) {
        id
        title
        description
        category
        priority
        status
        department_routing
        sla_deadline
        is_sla_breached
        created_by
        assigned_to
        resolved_by
        resolved_at
        resolution_notes
        created_at
        updated_at
        creator {
          prn
          name
          email
          department
          year
          roll_no
          hosteller
        }
        comments {
          id
          author_id
          author_role
          author_name
          comment
          created_at
        }
        timeline {
          id
          actor
          action
          from_status
          to_status
          notes
          created_at
        }
      }
    }
  `;
  const data = await gqlRequest(query, { id });
  return data.ticket;
}

export async function createTicket(ticketInput) {
  const query = `
    mutation CreateTicket($input: CreateTicketInput!) {
      createTicket(input: $input) {
        id
        title
        description
        category
        priority
        status
        department_routing
        sla_deadline
        is_sla_breached
        created_by
        created_at
      }
    }
  `;
  const data = await gqlRequest(query, { input: ticketInput });
  return data.createTicket;
}

export async function addTicketComment(ticketId, comment) {
  const query = `
    mutation AddComment($ticketId: ID!, $comment: String!) {
      addComment(ticketId: $ticketId, comment: $comment) {
        id
        ticket_id
        author_id
        author_role
        author_name
        comment
        created_at
      }
    }
  `;
  const data = await gqlRequest(query, { ticketId, comment });
  return data.addComment;
}

export async function updateTicketStatus(id, status, notes) {
  const query = `
    mutation UpdateStatus($id: ID!, $status: TicketStatus!, $notes: String) {
      updateTicketStatus(id: $id, status: $status, notes: $notes) {
        id
        status
        resolved_by
        resolved_at
        resolution_notes
        updated_at
      }
    }
  `;
  const data = await gqlRequest(query, { id, status, notes });
  return data.updateTicketStatus;
}

export async function assignTicket(id, assignedTo, notes) {
  const query = `
    mutation AssignTicket($id: ID!, $assignedTo: String!, $notes: String) {
      assignTicket(id: $id, assignedTo: $assignedTo, notes: $notes) {
        id
        status
        assigned_to
        updated_at
      }
    }
  `;
  const data = await gqlRequest(query, { id, assignedTo, notes });
  return data.assignTicket;
}

export async function fetchAnalytics() {
  const query = `
    query Analytics {
      ticketAnalytics {
        total
        open
        in_progress
        resolved
        closed
        sla_breached
        by_category {
          category
          count
        }
        by_priority {
          priority
          count
        }
      }
    }
  `;
  const data = await gqlRequest(query);
  return data.ticketAnalytics;
}
