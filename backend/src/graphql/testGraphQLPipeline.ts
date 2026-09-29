/**
 * Automated Test Suite for CampusFlow GraphQL Gateway
 * Tests schema introspection, queries, nested aggregations, and authenticated mutations.
 */

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || "http://localhost:3000/graphql";

async function graphqlRequest(query: string, variables: Record<string, any> = {}, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as any;
  if (body.errors && body.errors.length > 0) {
    throw new Error(`GraphQL Error: ${JSON.stringify(body.errors, null, 2)}`);
  }
  return body.data;
}

async function runGraphQLTests() {
  console.log("=================================================");
  console.log("🚀 Running CampusFlow GraphQL Gateway Test Suite");
  console.log(`Endpoint: ${GRAPHQL_ENDPOINT}`);
  console.log("=================================================\n");

  const timestamp = Date.now();
  const testPrn = `PRN-GQL-${timestamp}`;
  const testEmail = `gql.student.${timestamp}@campusflow.edu`;
  const testPassword = "Password123!";

  // Test 1: Query Ticket Analytics (Public / Unauthenticated)
  console.log("▶ Test 1: Querying Ticket Analytics...");
  const analyticsQuery = `
    query GetAnalytics {
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
  const analyticsData = await graphqlRequest(analyticsQuery);
  console.log("✔ Analytics retrieved successfully:", JSON.stringify(analyticsData.ticketAnalytics, null, 2));

  // Test 2: Mutation Register Student
  console.log("\n▶ Test 2: Registering a student via GraphQL Mutation...");
  const registerMutation = `
    mutation Register($input: RegisterStudentInput!) {
      registerStudent(input: $input) {
        auth_id
        prn
        name
        email
      }
    }
  `;
  const registerData = await graphqlRequest(registerMutation, {
    input: {
      prn: testPrn,
      name: "GraphQL Test Student",
      email: testEmail,
      password: testPassword,
      department: "COMPUTER_SCIENCE",
      year: 3,
      roll_no: `CS-${timestamp % 1000}`,
      hosteller: true,
    },
  });
  console.log("✔ Student registered successfully:", registerData.registerStudent);

  // Test 3: Mutation Login
  console.log("\n▶ Test 3: Authenticating via GraphQL Login Mutation...");
  const loginMutation = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user {
          auth_id
          email
          role
          prn
          name
        }
      }
    }
  `;
  const loginData = await graphqlRequest(loginMutation, {
    input: {
      email: testEmail,
      password: testPassword,
    },
  });
  const token = loginData.login.token;
  console.log("✔ Login successful. JWT token received for:", loginData.login.user.email);

  // Test 4: Query Current User (Authenticated 'me')
  console.log("\n▶ Test 4: Querying 'me' with Bearer JWT...");
  const meQuery = `
    query CurrentUser {
      me {
        auth_id
        email
        role
        name
        prn
      }
    }
  `;
  const meData = await graphqlRequest(meQuery, {}, token);
  console.log("✔ 'me' query result:", meData.me);

  // Test 5: Mutation Create Ticket (Authenticated Student, Category HOSTEL)
  console.log("\n▶ Test 5: Creating Ticket via GraphQL (triggers inter-service gRPC + transactional outbox)...");
  const createTicketMutation = `
    mutation CreateTicket($input: CreateTicketInput!) {
      createTicket(input: $input) {
        id
        title
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
  const ticketData = await graphqlRequest(
    createTicketMutation,
    {
      input: {
        title: "Room 304 Fan Malfunction",
        description: "Ceiling fan stopped working after voltage surge in Block B.",
        category: "HOSTEL",
        priority: "HIGH",
      },
    },
    token
  );
  const ticketId = ticketData.createTicket.id;
  console.log("✔ Ticket created via GraphQL:", ticketData.createTicket);

  // Test 6: Mutation Add Discussion Comment
  console.log("\n▶ Test 6: Adding discussion comment via GraphQL Mutation...");
  const commentMutation = `
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
  const commentData = await graphqlRequest(
    commentMutation,
    {
      ticketId,
      comment: "Hostel warden confirmed electrician will inspect between 4 PM and 6 PM.",
    },
    token
  );
  console.log("✔ Comment added via GraphQL:", commentData.addComment);

  // Test 7: Unified Graph Query with Nested Resolvers (Ticket + Comments + Timeline + Creator)
  console.log("\n▶ Test 7: Querying Ticket with Deep Aggregation (Comments + Timeline + Creator)...");
  const deepTicketQuery = `
    query GetTicketDeep($id: ID!) {
      ticket(id: $id) {
        id
        title
        status
        department_routing
        sla_deadline
        creator {
          prn
          name
          email
          department
          hosteller
        }
        comments {
          id
          author_name
          comment
          created_at
        }
        timeline {
          id
          actor
          action
          notes
          created_at
        }
      }
    }
  `;
  const deepData = await graphqlRequest(deepTicketQuery, { id: ticketId }, token);
  console.log("✔ Deep GraphQL Aggregation result:");
  console.log(JSON.stringify(deepData.ticket, null, 2));

  // Test 8: Query Tickets List with Filters and Pagination
  console.log("\n▶ Test 8: Querying Tickets list with category filter...");
  const listQuery = `
    query ListTickets($category: TicketCategory, $limit: Int) {
      tickets(category: $category, limit: $limit) {
        total
        tickets {
          id
          title
          category
          status
          created_by
        }
      }
    }
  `;
  const listData = await graphqlRequest(listQuery, { category: "HOSTEL", limit: 5 });
  console.log(`✔ Found ${listData.tickets.total} total tickets matching filter.`);

  console.log("\n=================================================");
  console.log("🎉 ALL GRAPHQL GATEWAY TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runGraphQLTests().catch((err) => {
  console.error("\n❌ GraphQL Test Suite Failed:", err);
  process.exit(1);
});
