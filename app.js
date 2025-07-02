// ⬆️ Import comes first
import { API_BASE_URL } from './config.js';

// ✅ Then set up userId and registration
let userId = null;

document.getElementById("startBtn").addEventListener("click", async () => {
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();

  if (!name) {
    alert("Please enter your name to begin.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/register_user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    userId = data.user_id;

    // Hide name form and show quiz
    document.getElementById("namePrompt").classList.add("d-none");
    document.getElementById("quizCard").classList.remove("d-none");

    // Kick off the first question
    loadQuestion();
  } catch (err) {
    console.error("Registration error:", err);
    alert("Something went wrong — please try again.");
  }
});

// 👇 Continue with question/game variables
const DIFFICULTY_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
let questions = [], usedQuestions = [], currentQuestion = {}, currentDifficultyIndex = 0;
let score = 0, questionCount = 0, maxQuestions = 60;
let passageMap = {}, rubrics = {};

    // Function to load questions, passages, and rubrics from local endpoints
    async function loadQuestions() {
      try {
        // Reset quiz state when loading questions (useful for restart)
        score = 0;
        questionCount = 0;
        usedQuestions = [];
        currentDifficultyIndex = 0;

        const [questionsRes, passagesRes, rubricsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/questions`),
          fetch(`${API_BASE_URL}/passages`),
          fetch(`${API_BASE_URL}/rubrics`)
        ]);

        questions = await questionsRes.json();
        console.log("📦 Questions loaded:", questions);
        passageMap = await passagesRes.json();
        rubrics = await rubricsRes.json();

        // Start the first question after loading everything
        nextQuestion();
      } catch (error) {
        console.error("Failed to load quiz data:", error);
        // Display a user-friendly message if data fails to load
        document.getElementById("quizCard").innerHTML = `<div class="alert alert-danger" role="alert">
          Failed to load quiz data. Please ensure the backend server is running.
        </div>`;
      }
    }

    // Determine the pool of available questions for the current difficulty level
    function getCurrentPool() {
      const level = DIFFICULTY_ORDER[currentDifficultyIndex];
      // Filter out questions already used by checking their IDs
      return questions.filter(q => q.difficulty === level && !usedQuestions.includes(q.id));
    }

    // Pick a random question from a given pool
    function pickRandom(pool) {
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Advance to the next question
    function nextQuestion() {
      if (questionCount >= maxQuestions) {
        return showFinalResults(); // End the test if max questions reached
      }

      const pool = getCurrentPool();
      
      // If no questions left at current difficulty, try next difficulty level
      if (pool.length === 0) {
        if (currentDifficultyIndex < DIFFICULTY_ORDER.length - 1) {
          currentDifficultyIndex++;
          return nextQuestion(); // Recursively call to get question from next level
        } else {
          // No more questions available across all difficulties
          console.warn("No more unique questions available across all difficulty levels.");
          return showFinalResults();
        }
      }

      currentQuestion = pickRandom(pool);
      if (!currentQuestion) {
        // Fallback if pickRandom somehow returns null (shouldn't happen with the pool.length check)
        return showFinalResults();
      }

      usedQuestions.push(currentQuestion.id); // Mark question as used
      questionCount++; // Increment overall question count

      // Periodically increase difficulty to challenge the user
      // Example: Every 5 questions, try to move to the next difficulty band
      if (questionCount % 5 === 0 && currentDifficultyIndex < DIFFICULTY_ORDER.length - 1) {
        currentDifficultyIndex++;
      }

      renderQuestion(currentQuestion); // Display the selected question
    }

    // Render the question details on the UI
    function renderQuestion(q) {
      document.getElementById("progressText").textContent = `Question ${questionCount} of ${maxQuestions}`;
      document.getElementById("questionText").textContent = q.questionText;
      document.getElementById("metaInfo").textContent = `Category: ${q.category} | Difficulty: ${q.difficulty}`;

      // Handle Reading Passage display
      const readingCard = document.getElementById("readingCard");
      const readingText = document.getElementById("readingText");
      if (q.readingId && passageMap[q.readingId]) {
        readingText.textContent = passageMap[q.readingId];
        readingCard.classList.remove("d-none");
      } else {
        readingCard.classList.add("d-none");
      }

      // Handle Rubric Preview display
      const rubricPanel = document.getElementById("rubricPanel");
      const rubricContent = document.getElementById("rubricContent");
      if (q.rubricId && rubrics[q.rubricId]) {
        rubricContent.textContent = rubrics[q.rubricId];
        rubricPanel.classList.remove("d-none");
        rubricContent.classList.add("d-none"); // Keep rubric content hidden by default
      } else {
        rubricContent.textContent = "";
        rubricPanel.classList.add("d-none");
      }

      // Handle Audio media display
      const audio = document.getElementById("audio");
      if (q.audio) {
        audio.src = `${API_BASE_URL}/audio/${q.audio}`;
        audio.style.display = "block";
      } else {
        audio.style.display = "none";
      }

      // Handle Image media display
      const img = document.getElementById("image");
      if (q.image) {
        img.src = q.image;
        img.style.display = "block";
      } else {
        img.style.display = "none";
      }

      // Populate the input area based on answer type
      const form = document.getElementById("choicesForm");
      form.innerHTML = ""; // Clear previous choices

      if (q.answerType === "spoken-response") {
        form.innerHTML = `
          <p><strong>Your task:</strong> Speak your response using the microphone below.</p>
          <button id="recordBtn" class="btn btn-secondary mb-2">🎙️ Start Recording</button>
          <p id="recordingStatus" class="text-muted mb-2"></p>
          <audio id="playback" class="d-none" controls></audio>
        `;
        setupSpeakingRecording(q); // Initialize recording functionality
      } else if (q.answerType === "open-ended") {
        form.innerHTML = `
          <label for="writtenAnswer" class="form-label">Your answer:</label>
          <textarea id="writtenAnswer" class="form-control" rows="5" placeholder="Write at least ${q.minWordCount || 0} words..."></textarea>
        `;
      } else { // Default to multiple choice
        q.choices.forEach((choice, i) => {
          const id = `choice${i}`;
          form.innerHTML += `
            <div class="form-check">
              <input class="form-check-input" type="radio" name="choice" id="${id}" value="${choice}">
              <label class="form-check-label" for="${id}">${choice}</label>
            </div>
          `;
        });
      }

      // Reset button visibility for new question
      document.getElementById("submitBtn").classList.remove("d-none");
      document.getElementById("nextBtn").classList.add("d-none");
    }

    // Setup speech recording functionality for spoken-response questions
    function setupSpeakingRecording(q) {
      const recordBtn = document.getElementById("recordBtn");
      const status = document.getElementById("recordingStatus");
      const playback = document.getElementById("playback");

      let mediaRecorder, chunks = [];

      recordBtn.onclick = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          chunks = [];

          recordBtn.disabled = true;
          status.textContent = "🎤 Recording...";
          playback.classList.add("d-none"); // Hide playback during recording

          mediaRecorder.ondataavailable = e => chunks.push(e.data);
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            playback.src = URL.createObjectURL(blob);
            playback.classList.remove("d-none"); // Show playback after recording
            status.textContent = `✅ Recording complete (${Math.round(blob.size / 1024)} KB)`;
          };

          mediaRecorder.start();
          // Stop recording after 10 seconds (configurable)
          setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
              mediaRecorder.stop();
              stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
              recordBtn.disabled = false;
            }
          }, 10000); // 10 seconds recording limit
        } catch (error) {
          console.error("Error accessing microphone:", error);
          status.textContent = "Error: Could not access microphone. Please grant permission.";
          recordBtn.disabled = false;
        }
      };
    }

    // Check the user's answer and update score
    function checkAnswer() {
      const result = document.getElementById("result");
      result.classList.remove("d-none", "alert-info", "alert-success", "alert-danger"); // Clear previous states

      if (currentQuestion.answerType === "spoken-response") {
        const audio = document.getElementById("playback");
        if (!audio || !audio.src) {
          // Use a custom message box or alert alternative instead of window.alert
          result.classList.add("alert-warning");
          result.textContent = "Please record your response before submitting.";
          return;
        }
        result.classList.add("alert-success");
        result.textContent = "✅ Response recorded! (Review not available in this demo)";
        fetch(`${API_BASE_URL}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            mode: "speaking",
            transcript: "This is a placeholder transcript"  // Replace with real transcript later
  })
})
.then(res => res.json())
.then(data => console.log("🎙️ Speaking evaluation response:", data))
.catch(err => console.error("❌ Speaking evaluation error:", err));

        score++; // Score is incremented, but actual assessment would be done by AI/human
      } else if (currentQuestion.answerType === "open-ended") {
        const input = document.getElementById("writtenAnswer").value.trim();
        const wordCount = input.split(/\s+/).filter(Boolean).length; // Count non-empty words
        const minWords = currentQuestion.minWordCount || 50; // Default minimum words

        if (wordCount >= minWords) {
          result.classList.add("alert-success");
          result.textContent = `✅ Answer submitted! Word count: ${wordCount}`;
          fetch(`${API_BASE_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              mode: "writing",
              transcript: input
            })
          })
.then(res => res.json())
.then(data => console.log("📝 Writing evaluation response:", data))
.catch(err => console.error("❌ Writing evaluation error:", err));
          score++; // Score is incremented, but actual assessment would be done by AI/human
        } else {
          result.classList.add("alert-danger");
          result.textContent = `❌ Minimum word count not met. You wrote ${wordCount} words, but at least ${minWords} are required.`;
          return; // Prevent proceeding if word count not met
        }
      } else { // Multiple choice
        const selected = document.querySelector("input[name='choice']:checked");
        if (!selected) {
          // Use a custom message box or alert alternative
          result.classList.add("alert-warning");
          result.textContent = "Please select an answer.";
          return;
        }

        const normalize = (str) => str.trim().toLowerCase();
        const isCorrect = normalize(selected.value) === normalize(currentQuestion.correctAnswer);
        result.classList.add(isCorrect ? "alert-success" : "alert-danger");
        result.textContent = isCorrect
          ? "✅ Correct!"
          : `❌ Incorrect. Correct answer: ${currentQuestion.correctAnswer}`;
        if (isCorrect) score++;
      }

      // Show next button, hide submit button
      document.getElementById("submitBtn").classList.add("d-none");
      document.getElementById("nextBtn").classList.remove("d-none");
    }

    // Function to display the final test results
    async function showFinalResults() {
      document.getElementById("quizCard").classList.add("d-none"); // Hide the quiz
      document.getElementById("result").classList.add("d-none"); // Hide the current question's result message

      // Call the new showSummary function to populate and display the summary card
      await showSummary(userId);
    }

    // Function to toggle rubric visibility
    function toggleRubric() {
      const content = document.getElementById("rubricContent");
      content.classList.toggle("d-none");
    }

    // New function to fetch and display user summary from backend
    async function showSummary(userId) {
      try {
        // Fetch summary data from your backend endpoint
        const res = await fetch(`${API_BASE_URL}/summary?user_id=${userId}`);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        // ➕ Fill HTML fields with fetched data
        document.getElementById("totalSubmissions").textContent = data.total_submissions ?? "N/A";
        // Convert average score to a fixed-point number for display
        document.getElementById("averageScore").textContent = parseFloat(data.average_score ?? 0).toFixed(1);
        document.getElementById("mostRecentMode").textContent = data.most_recent_mode ?? "N/A";
        // Ensure mostRecentScore is displayed correctly, assuming it's out of 5 from backend
        document.getElementById("mostRecentScore").textContent = parseFloat(data.most_recent_score ?? 0).toFixed(1);
        document.getElementById("lastUpdated").textContent = data.last_updated
          ? new Date(data.last_updated).toLocaleString()
          : "N/A";

        // Update Score Progress Bar based on average score from backend
        const avg = parseFloat(data.average_score ?? 0);
        const percentage = (avg / 5) * 100; // Assuming average_score is out of 5
        const scoreBar = document.getElementById("scoreBar");
        scoreBar.style.width = `${percentage}%`;
        scoreBar.setAttribute("aria-valuenow", avg.toFixed(1));
        scoreBar.textContent = `${avg.toFixed(1)} / 5`;

        // Update CEFR Badge based on average score
        const badge = document.getElementById("cefrBadge");
        let level = "Unrated", badgeClass = "bg-secondary";

        if (avg >= 4.5) { level = "C1+"; badgeClass = "bg-success"; }
        else if (avg >= 3.5) { level = "B2"; badgeClass = "bg-primary"; }
        else if (avg >= 2.5) { level = "B1"; badgeClass = "bg-info"; }
        else if (avg >= 1.5) { level = "A2"; badgeClass = "bg-warning text-dark"; }
        else { level = "A1"; badgeClass = "bg-danger"; }

        badge.textContent = `Your Level: ${level}`;
        badge.className = `badge fs-6 mb-3 ${badgeClass}`; // Update classes directly

        // Update Motivational Message
        const message = document.getElementById("encouragement");
        let line = "Keep going—you're building toward confident communication!";
        if (avg >= 4.5) line = "Impressive! You're approaching near-native fluency. 🌟";
        else if (avg >= 3.5) line = "Solid B2! You're well on your way to advanced mastery.";
        else if (avg >= 2.5) line = "You're in the B1 zone—keep climbing! 🚀";
        else if (avg >= 1.5) line = "A2 emerging—focus on clarity and word variety.";
        else line = "Let’s build from the basics. Every response is progress! 💪";

        message.textContent = line;
        document.getElementById("summaryCard").classList.remove("d-none"); // Show the summary card
      } catch (error) {
        console.error("Summary fetch failed:", error);
        // Display an error message to the user if summary data can't be fetched
        const summaryCard = document.getElementById("summaryCard");
        summaryCard.classList.remove("d-none");
        summaryCard.innerHTML = `<div class="alert alert-danger" role="alert">
          Failed to load performance summary. Please ensure the backend server for summary data is running.
        </div>`;
      }
    }

    // Function to generate and download a PDF summary
    async function generatePdfSummary() {
      const summaryCard = document.getElementById('summaryCard');
      // Temporarily hide buttons that shouldn't be in the PDF
      const buttonsDiv = summaryCard.querySelector('.d-flex.justify-content-center.gap-2');
      if (buttonsDiv) {
        buttonsDiv.style.display = 'none';
      }

      // Use html2canvas to render the summary card as an image
      html2canvas(summaryCard, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' for size
        const imgWidth = 190; // A4 width is 210mm, leaving 10mm margin on each side
        const pageHeight = 297; // A4 height is 297mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 10; // Start position with a top margin

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // If content is longer than one page, add new pages
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + 10; // Adjust position for subsequent pages
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('English_Proficiency_Summary.pdf'); // Save the PDF

        // Restore button visibility after PDF generation
        if (buttonsDiv) {
          buttonsDiv.style.display = 'flex'; // Restore flex display
        }
      }).catch(error => {
        console.error("Error generating PDF:", error);
        // Display a user-friendly message
        document.getElementById("result").classList.remove("d-none", "alert-info", "alert-success");
        document.getElementById("result").classList.add("alert-danger");
        document.getElementById("result").textContent = "❌ Failed to generate PDF. Please try again.";
      });
    }


    // Event Listeners
    document.getElementById("submitBtn").addEventListener("click", checkAnswer);
    document.getElementById("nextBtn").addEventListener("click", () => {
      document.getElementById("result").classList.add("d-none"); // Hide result before next question
      nextQuestion();
    });

    // Event listener for the restart button
    document.getElementById("restartBtn").addEventListener("click", () => {
      document.getElementById("summaryCard").classList.add("d-none"); // Hide summary view
      document.getElementById("quizCard").classList.remove("d-none"); // Show quiz card
      document.getElementById("result").classList.add("d-none"); // Hide any lingering result message
      loadQuestions(); // Restart quiz fresh, which also resets internal state
    });

    // Event listener for the new PDF download button
    document.getElementById("downloadPdfBtn").addEventListener("click", generatePdfSummary);

    // Initial load of questions when the page loads
    loadQuestions();