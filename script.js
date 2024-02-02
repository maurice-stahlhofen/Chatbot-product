const chatInput = document.querySelector(".chat-input textarea")
const sendChatBtn = document.querySelector(".chat-input span")
const closeChatBtn = document.getElementById("closeChatBtn")
const deleteChatBtn = document.getElementById("deleteChat-btn")
const chatBox = document.querySelector(".chatbox")
const urlBtn = document.getElementById("urlBtn")



const TrainingFileID = "file-97yavDZarV3Kx9UlVgvO0t8L"; 
const FINE_TUNED_MODEL_ID = "ID";

let userMessage;
let chatMessages = [];
let currentUrl;
let product = [];

let isFirstMessage = true;

//Enter API key from .env file here or use your own. Costs money!!!!
const API_KEY = "";
const FILE_PATH = './fineTune.json';

const formData = new FormData();

//When page loads, display first message from bot
window.onload = async function () {
    product = [];
    const timestamp = getTime();
  
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTab = tabs[0];
        currentUrl = currentTab.url;
        extractDatafromUrl(currentUrl);
        console.log(product);
      });
    }
  
    // Check if the assistant already has information about the product
    const hasProductInformation = product && product.length > 0 && product[0].message;
  
    if (!hasProductInformation) {
      const lastTimestamp = getLastTimestamp();
      const lastTimestampMilliseconds = lastTimestamp ? GetLastTimestampMilliseconds(lastTimestamp) : null;
      const oneHourInMilliseconds = 60 * 60 * 1000;
  
      // Checks if last message was sent more than 1 hour ago and if there is a timestamp.
      // Only then a new message is generated
      if (!lastTimestampMilliseconds || (Date.now() - lastTimestampMilliseconds > oneHourInMilliseconds)) {
        const newTimestamp = getTime();
        setTimeout(() => {
          const botChatLine = createChatLine("...", "system", newTimestamp);
          chatBox.appendChild(botChatLine);
          generateResponse(botChatLine);
          isFirstMessage = false;
        }, 500);
      }
    }
  
    chatInput.value = "";
    chatBox.scrollTo(0, chatBox.scrollHeight);
  };

const generateResponse = async (botChatLine) => {
    const API_URL = "https://api.openai.com/v1/chat/completions";
    const messageElement = botChatLine.querySelector("p");

    if(API_KEY === "") {
        messageElement.textContent = "Test environment please enter API key";
        chatMessages.push({message: messageElement.textContent, role: "system"});
        localStorage.setItem("chatMessages", JSON.stringify(chatMessages));
        return;
    }

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            max_tokens: 1500,
            temperature: 0.7,
            messages: [
                ...chatMessages.map(msg => ({ role: msg.role, content: msg.message })),
                ...(product && product.length > 0 ? product.map(msg => ({ role: msg.role, content: msg.message })) : []),
                {
                    role: "system",
                    content: "This is a conversation between a Support Bot and a customer who is looking for information on various products. The assistant will lead the conversation. Always ask the person questions in each reply to continue the conversation. You will ask the person questions about the product. Ask about specific features. Get information about three features before making a recommendation. If the user doesn't want to know about the product go to the previous asked question. Don't say that you are an AI language model. Say you are a smart Assistant. If the user wants to chit chat answer that one question but go back to recommanding products again." },
                {
                    role: "system",
                    content: "If the user asks for features of the product, provide five features to be considered in a product based on the lastest market information you have. " },     
                {
                    role: "system",
                    content: "Your task is to help the person with the search of a product and provide two recommendations based on the lastest market information you have." },
                {
                    role: "system",
                    content: `If the user wants to know information about a Amazon Product. Provide this Information ${product && product.length > 0 ? product[0].message : 'No Information to the product available'}` },       
                {
                    role: "assistant",
                    content: "Hi there! How can I assist you today? Are you looking for specific information about a particular product?" },
                { 
                    role: "user", 
                    content: userMessage }, 
            ].filter(msg => msg.content !== null && msg.content !== undefined && msg.content !== ""), //Filters null messages. For example the initial message does not have a user message
        }),
    }

    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();

        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            messageElement.textContent = data.choices[0].message.content;

            const timestamp = getTime();
            chatMessages.push({ message: messageElement.textContent, role: "system", timestamp: timestamp });
            localStorage.setItem("chatMessages", JSON.stringify(chatMessages));
            
            createChatLine(messageElement.textContent, "system", timestamp);
        } else {
            console.error("Unexpected API response format:", data);
            messageElement.textContent = "Unexpected API response";
        }
    } catch (error) {
        console.log(error);
        messageElement.textContent = "Something went wrong";
    } finally {
        chatBox.scrollTo(0, chatBox.scrollHeight);
    }
};

const extractDatafromUrl =  async (url) => {
    fetch(url)
    .then(response => response.text())
    .then(html => {
        // Create a temporary container element to parse the HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // Extract product information
        let title = doc.querySelector('#productTitle');
        let price = doc.querySelector('.a-price-whole');
        let rating = doc.querySelector('#acrPopover');
        let deliveryInfo = doc.querySelector('#whatsInTheBoxDeck');
        
        let productDetailsElement = doc.querySelector('#detailBullets_feature_div');
        let productDetails = productDetailsElement ? productDetailsElement.innerText.replace(/\s+/g, ' ').trim() : 'N/A';

        
        // Output the extracted information
        //console.log('Product Title:', title ? title.innerText.trim() : 'N/A');
        //console.log('Product Rating:', rating ? rating.getAttribute('title') : 'N/A');
        //console.log('Delivery Information:', deliveryInfo ? deliveryInfo.innerText.trim() : 'N/A');
        //console.log('Product Details:', productDetails ? productDetails.innerText.replace(/\s+/g, ' ').trim() : 'N/A');
        //console.log('Product Price:', price ? price.textContent.replace(',', '').trim() : 'N/A');
        
        // Create a product object with the extracted information

        const productObject = {
            message: `Product Title: ${title ? title.innerText.trim() : 'N/A'}, Price: ${price ? price.textContent.replace(',', '').trim() : 'N/A'}, Rating: ${rating ? rating.getAttribute('title') : 'N/A'}, Delivery Information: ${deliveryInfo ? deliveryInfo.innerText.trim() : 'N/A'}, Product Details: ${productDetails}`,
            role: "system",
        };
        product.push(productObject);
    })
    .catch(error => console.error('Error fetching the page:', error));
}


//Create message to html class user/bot for example
const createChatLine = (message, className, timestamp) => {
    const chatLine = document.createElement("li");
    chatLine.classList.add("chat", className);

    if (className === "user") {
        chatLine.innerHTML = `<p>${message}</p>`;
    } else if (className === "system") {
        chatLine.innerHTML = `<span class="material-symbols-outlined">smart_toy</span><p>${message}</p>`;
        // For bot messages, add the message to the chatLine's dataset
        chatLine.dataset.message = message;
    }
    
    if (timestamp && isFirstMessage) {
        const timestampSpan = document.createElement("span");
        timestampSpan.classList.add("timestamp");
        timestampSpan.textContent = timestamp;
        chatLine.appendChild(timestampSpan);

        // Set isFirstMessage to false after adding the timestamp to the first message
        isFirstMessage = false;
    }
    return chatLine;
}

const handleChat = () => {
    userMessage = chatInput.value.trim();
    if(!userMessage) return;

    // Append user message to chat messages array
    chatMessages.push({ message: userMessage, role: "user"});

    // Save chat messages to local storage
    localStorage.setItem("chatMessages", JSON.stringify(chatMessages));

    //append user message to chatbox
    const userChatLine = createChatLine(userMessage, "user");
    chatBox.appendChild(userChatLine);
    chatBox.scrollTo(0, chatBox.scrollHeight)

    //Displays while generating message
    setTimeout(() => {
        const botChatLine = createChatLine("...", "system")
        chatBox.appendChild(botChatLine);
        chatBox.scrollTo(0, chatBox.scrollHeight)
        generateResponse(botChatLine);
    }, 500);
    chatInput.value = "";
}

// First retrieves chat Messages from local storage and Display chat messages
if (localStorage.getItem("chatMessages")) {
    chatMessages = JSON.parse(localStorage.getItem("chatMessages"));
}
if (localStorage.getItem("chatMessages")) {
    chatMessages = JSON.parse(localStorage.getItem("chatMessages"));
    chatMessages.forEach((msg) => {
        const chatLine = createChatLine(msg.message, msg.role, msg.timestamp);
            chatBox.appendChild(chatLine);
    });
}


sendChatBtn.addEventListener("click", handleChat)

closeChatBtn.addEventListener("click", () => {
    window.close();
})

//Deletes chat messages from local storage
deleteChatBtn.addEventListener("click", () => {
    localStorage.removeItem("chatMessages");
    chatMessages = [];
    window.location.reload();
})

chatInput.addEventListener("keypress",  function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Prevent the default behavior (e.g., new line)
        handleChat();
    }
});

//Get the current time in Format day.month., hour:minute
function getTime() {
    let today = new Date();
    const options = { day: "numeric", month: "numeric", hour: "numeric", minute: "numeric" };
    const time = today.toLocaleString("de-DE", options);
    return time;
}

function GetLastTimestampMilliseconds(timestamp) {
        // Split the timestamp into date and time parts
        const [datePart, timePart] = timestamp.split(', ');
        // Parse the date part to get day and month
        const [day, month] = datePart.split('.').map(part => parseInt(part));
        // Parse the time part to get hour and minute
        const [hour, minute] = timePart.split(':').map(part => parseInt(part));
        // Create a new Date object with the current year, parsed month, day, hour, and minute
        const currentYear = new Date().getFullYear();
        const extractedDate = new Date(currentYear, month - 1, day, hour, minute);
        lastMessageTimestamp = extractedDate.getTime();
        return lastMessageTimestamp;
}

//Retrieve the last message's timestamp
function getLastTimestamp() {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
        const message = chatMessages[i];
        if (message.timestamp) {
            return message.timestamp;
        }
    }
    return null;
}
//Implemented functions that hasn't been used or for a short time only
 const fineTuneModel = async () => {
    await uploadFile();
    await trainModel();
}

//Couldn't continue because of free plan
const trainModel = async () => {
    const FineTune_URL = `https://api.openai.com/v1/fine_tuning/jobs`;
    fetch(FineTune_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            "training_file": TrainingFileID,
            "model": "gpt-3.5-turbo-0613"
        }),
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response data
        console.log('Fine-tuning job response:', data);
    })
    .catch(error => {
        // Handle errors
        console.error('Error creating fine-tuning job:', error);
    });
};


const uploadFile = async () => {
    const File_URL = 'https://api.openai.com/v1/files';
    fetch(FILE_PATH)
        .then(response => response.json())
        .then(fileContent => {
            // Append the purpose and the file content to the FormData
            formData.append('purpose', 'fine-tune');
            formData.append('file', new Blob([JSON.stringify(fileContent)], { type: 'application/json' }));

            // Make the fetch request
            return fetch(File_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: formData,
            });
        })
        .then(response => response.json())
        .then(data => {
            // Handle the response data
            console.log('File upload response:', data);
        })
        .catch(error => {
            // Handle errors
            console.error('Error uploading file:', error);
        });
}


const getModels = async () => { //lost cause
    const API_URL = "https://api.openai.com/v1/models";
    const requestOptions = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
    }
    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.log(error);
    }
}
