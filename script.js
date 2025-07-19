/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Function to add messages to the chat window */
function addMessageToChat(message, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender);
  messageDiv.textContent = message;
  chatWindow.appendChild(messageDiv);

  // Scroll to the bottom to show the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to get AI response from OpenAI */
async function getAIResponse(userMessage) {
  try {
    // Show loading message while waiting for response
    addMessageToChat("Thinking...", "ai");

    // Prepare the system message with product knowledge
    const products = await loadProducts();
    const systemMessage = `You are a helpful L'Oréal beauty advisor. Help users build skincare and beauty routines using these available products: ${JSON.stringify(
      products
    )}. Provide personalized recommendations based on their needs, skin type, and concerns. Keep responses friendly and informative.`;

    // Make request to your Cloudflare Worker endpoint instead of OpenAI directly
    const response = await fetch(
      "https://loreal-builder.mjramse1.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemMessage,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // Parse the response
    const data = await response.json();

    // Remove the loading message
    const loadingMessage = chatWindow.querySelector(".message.ai:last-child");
    if (loadingMessage && loadingMessage.textContent === "Thinking...") {
      loadingMessage.remove();
    }

    // Get the AI's response from the API data
    const aiResponse = data.choices[0].message.content;
    return aiResponse;
  } catch (error) {
    // Remove the loading message if there was an error
    const loadingMessage = chatWindow.querySelector(".message.ai:last-child");
    if (loadingMessage && loadingMessage.textContent === "Thinking...") {
      loadingMessage.remove();
    }

    console.error("Error getting AI response:", error);
    return "Sorry, I'm having trouble connecting right now. Please try again later.";
  }
}

/* Chat form submission handler with OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get the user's message from the input field
  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  // Don't send empty messages
  if (!userMessage) return;

  // Add user's message to chat
  addMessageToChat(userMessage, "user");

  // Clear the input field
  userInput.value = "";

  // Get AI response and add it to chat
  const aiResponse = await getAIResponse(userMessage);
  addMessageToChat(aiResponse, "ai");
});
