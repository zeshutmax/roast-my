const loadingMessages = [
  "Warming up the roasting machine... 🔥",
  "Preparing savage commentary... 😈",
  "Channeling Gordon Ramsay... 👨‍🍳",
  "Loading witty responses... 🎭",
  "Analyzing design choices... 🤔",
  "Gathering roasting materials... 🔍",
  "Preparing brutal honesty... 💅"
];

function tryExample(url) {
  const urlInput = document.getElementById('urlInput');
  urlInput.value = url;
  
  // Add visual feedback
  urlInput.classList.add('highlight');
  setTimeout(() => urlInput.classList.remove('highlight'), 1000);
  
  // Smooth scroll to input
  urlInput.scrollIntoView({ 
    behavior: 'smooth',
    block: 'center'
  });
  
  // Collapse examples grid
  const examplesGrid = document.getElementById('examplesGrid');
  const toggleButton = document.querySelector('.examples-toggle');
  examplesGrid.classList.remove('visible');
  toggleButton.textContent = 'Show example targets 🎯';
  
  // Add small delay before analyzing
  setTimeout(() => {
    analyzeWebsite();
  }, 300);
}

function updateLoadingMessage() {
  const loadingMessage = document.querySelector('.loading-message');
  const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  loadingMessage.textContent = randomMessage;
}

function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="error-message">
            <p>😅 Oops! ${message}</p>
            <p>Try another URL or check if the website is accessible.</p>
        </div>
    `;
    resultDiv.classList.add('visible');
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

async function copyToClipboard() {
    const roastContent = document.querySelector('.roast-content').textContent;
    try {
        await navigator.clipboard.writeText(roastContent);
        showSuccessMessage('Roast copied to clipboard! 📋');
    } catch (err) {
        showError('Failed to copy to clipboard');
    }
}

// Add Enter key support
document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeWebsite();
    }
});

function toggleExamples() {
    const examplesGrid = document.getElementById('examplesGrid');
    const toggleButton = document.querySelector('.examples-toggle');
    
    if (examplesGrid.classList.contains('visible')) {
        examplesGrid.classList.remove('visible');
        toggleButton.textContent = 'Show example targets 🎯';
    } else {
        examplesGrid.classList.add('visible');
        toggleButton.textContent = 'Hide examples 👆';
    }
}

async function analyzeWebsite() {
    const urlInput = document.getElementById('urlInput');
    const resultDiv = document.getElementById('result');
    const url = urlInput.value.trim();

    if (!url) {
        showError('Please enter a valid URL');
        return;
    }

    try {
        // Reset and show the result div first
        resultDiv.innerHTML = `
            <div class="loading-container">
                <div class="loading-message"></div>
                <div class="loading-spinner"></div>
            </div>
            <div class="roast-content"></div>
            <div class="share-buttons">
                <button onclick="shareOnTwitter()" class="share-btn twitter">
                    <span>Share on Twitter</span> 🐦
                </button>
                <button onclick="shareOnFacebook()" class="share-btn facebook">
                    <span>Share on Facebook</span> 📱
                </button>
                <button onclick="shareOnLinkedIn()" class="share-btn linkedin">
                    <span>Share on LinkedIn</span> 💼
                </button>
                <button onclick="copyToClipboard()" class="share-btn copy">
                    <span>Copy Roast</span> 📋
                </button>
            </div>
        `;

        // Get fresh references
        const loadingContainer = resultDiv.querySelector('.loading-container');
        const roastContent = resultDiv.querySelector('.roast-content');
        const shareButtons = resultDiv.querySelector('.share-buttons');
        
        // Show loading state
        resultDiv.classList.add('visible');
        loadingContainer.style.display = 'block';
        roastContent.style.display = 'none';
        shareButtons.style.display = 'none';
        
        // Scroll to result immediately to show loading state
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Start loading messages
        updateLoadingMessage();
        const loadingInterval = setInterval(updateLoadingMessage, 2000);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (data.error) {
            clearInterval(loadingInterval);
            throw new Error(data.error);
        }

        // Clear loading state
        clearInterval(loadingInterval);
        loadingContainer.style.display = 'none';
        
        // Show result with animation
        roastContent.textContent = data.analysis;
        roastContent.style.display = 'block';
        shareButtons.style.display = 'flex';
        
        // Trigger confetti
        showConfetti();
        
        // Scroll again to ensure the full result is visible
        setTimeout(() => {
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } catch (error) {
        showError(error.message || 'Failed to analyze the website');
    }
}

function showResult(roastContent) {
    const resultDiv = document.getElementById('result');
    const loadingContainer = document.querySelector('.loading-container');
    const roastContentDiv = document.querySelector('.roast-content');
    const shareButtons = document.querySelector('.share-buttons');
    
    loadingContainer.style.display = 'none';
    roastContentDiv.style.display = 'block';
    roastContentDiv.textContent = roastContent;
    shareButtons.innerHTML = `
        <button onclick="shareOnTwitter()" class="share-btn twitter">
            <span>Share on Twitter</span> 🐦
        </button>
        <button onclick="shareOnFacebook()" class="share-btn facebook">
            <span>Share on Facebook</span> 📱
        </button>
        <button onclick="shareOnLinkedIn()" class="share-btn linkedin">
            <span>Share on LinkedIn</span> 💼
        </button>
        <button onclick="copyToClipboard()" class="share-btn copy">
            <span>Copy Roast</span> 📋
        </button>
    `;
    shareButtons.style.display = 'flex';
    
    // Smooth scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent('Check out this brutal website roast! 🔥');
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`, '_blank');
} 