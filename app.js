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

    // 👇 Load all questions/passages/rubrics before starting the quiz
    await loadQuestions();

    // Hide name form and show quiz
    document.getElementById("namePrompt").classList.add("d-none");
    document.getElementById("quizCard").classList.remove("d-none");

    // Start first question
    nextQuestion();
  } catch (err) {
    console.error("Registration error:", err);
    userId = null;
    alert("Something went wrong — please try again.");
  }
});

// 👇 Continue with question/game variables
const DIFFICULTY_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

let questions = [], usedQuestions = [], currentQuestion = {}, currentDifficultyIndex = 0;
let score = 0, questionCount = 0, maxQuestions = 60;
let passageMap = {}, rubrics = {};
let reviewLog = []; // Stores answer data for summary review

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
        const difficultyCounts = DIFFICULTY_ORDER.map(level => ({
          level,
          count: questions.filter(q => q.difficulty === level).length
}));
console.log("📊 Difficulty distribution:", difficultyCounts);
        console.log("📦 Loaded questions:", questions.length);
        console.log("🔍 First few difficulties:", questions.slice(0, 3).map(q => q.difficulty));
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
    function getCurrentPool(allowRepeats = false) {
  const level = DIFFICULTY_ORDER[currentDifficultyIndex];
  return questions.filter(q =>
    q.difficulty === level &&
    (allowRepeats || !usedQuestions.includes(q.id))
  );
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

let pool = [];
while (currentDifficultyIndex < DIFFICULTY_ORDER.length) {
  pool = getCurrentPool();
  if (pool.length === 0) {
    pool = getCurrentPool(true); // Try with repeats
    if (pool.length === 0) {
      currentDifficultyIndex++; // Skip to next level
      continue;
    }
  }
  break; // Found a valid pool
}

if (pool.length === 0) {
  console.warn("No questions available — even with repeats.");
  return showFinalResults();
}

// 🧼 Clear lingering result messages
const result = document.getElementById("result");
result.classList.add("d-none", "alert-info", "alert-success", "alert-danger", "alert-warning", "alert-secondary");
result.textContent = "";

      currentQuestion = pickRandom(pool);
      if (!currentQuestion) {
        // Fallback if pickRandom somehow returns null (shouldn't happen with the pool.length check)
        return showFinalResults();
      }

      usedQuestions.push(currentQuestion.id); // Mark question as used
      questionCount++; // Increment overall question count

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
  form.innerHTML += `
    <p><strong>Your task:</strong> Speak your response using the microphone below.</p>
    <button id="recordBtn" class="btn btn-secondary mb-2">🎙️ Start Recording</button>
    <p id="recordingStatus" class="text-muted mb-2"></p>
    <audio id="playback" class="d-none" controls></audio>
  `;
  setupSpeakingRecording(q);
}

if (q.answerType === "open-ended") {
  form.innerHTML += `
    <label for="writtenAnswer" class="form-label">Your answer:</label>
    <textarea id="writtenAnswer" class="form-control" rows="5" placeholder="Write at least ${q.minWordCount || 0} words..."></textarea>
  `;
}

// ✅ Unconditional rendering of choices (if present)
if (q.choices?.length) {
  q.choices.forEach((choice, i) => {
    const id = `choice${i}`;
    const label = choice.label ?? String.fromCharCode(65 + i);
    const text = choice.text ?? choice.choice_text ?? choice.answer ?? choice.value ?? "";

    form.innerHTML += `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="choice" id="${id}" value="${text}">
        <label class="form-check-label" for="${id}">${label}. ${text}</label>
      </div>
    `;
  });
} else if (q.choices) {
  // Only warn if `q.choices` is defined but empty
  form.innerHTML += `<p class="text-danger">⚠️ No choices available for this question.</p>`;
}

// Reset button visibility for new question
document.getElementById("submitBtn").classList.remove("d-none");
document.getElementById("nextBtn").classList.add("d-none");

function setupSpeakingRecording(q) {
  const recordBtn = document.getElementById("recordBtn");
  const status = document.getElementById("recordingStatus");
  const playback = document.getElementById("playback");

  let mediaRecorder;
  let chunks = [];

  recordBtn.onclick = async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        window.latestRecordingBlob = blob;
        const audioURL = URL.createObjectURL(blob);
        playback.src = audioURL;
        playback.classList.remove("d-none");
        status.textContent = "Recording complete. Ready to play.";
      };

      mediaRecorder.start();
      status.textContent = "Recording...";
      recordBtn.textContent = "🛑 Stop Recording";
    } else {
      mediaRecorder.stop();
      recordBtn.textContent = "🎙️ Start Recording";
    }
  };
}

    // Check the user's answer and update score
    async function checkAnswer() {
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
        result.classList.add("alert-secondary");
        result.textContent = "🎙️ Response submitted.";
        
        const blob = window.latestRecordingBlob;
if (!blob) {
  result.classList.add("alert-danger");
  result.textContent = "⚠️ No recording available. Please try again.";
  return;
}

const formData = new FormData();
formData.append("file", blob, "spoken-response.webm");

const transcriptRes = await fetch(`${API_BASE_URL}/transcribe`, {
  method: "POST",
  body: formData
});
const transcriptData = await transcriptRes.json();
const transcript = transcriptData.transcript ?? "[No transcript returned]";
if (!transcript || transcript === "[No transcript returned]") {
  result.classList.add("alert-warning");
  result.textContent = "❌ Transcription failed. Please try again.";
  return;
}


await fetch(`${API_BASE_URL}/evaluate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: userId,
    question_id: currentQuestion.id,
    mode: "speaking",
    response_text: transcript
  })
})
.then(res => res.json())
.then(data => console.log("🎙️ Speaking evaluation response:", data))
.catch(err => console.error("❌ Speaking evaluation error:", err));


        score++; // Score is incremented, but actual assessment would be done by AI/human
        reviewLog.push({
          question: currentQuestion.questionText,
          userAnswer: "Spoken response submitted",
          correctAnswer: "Evaluated after submission",
          correct: null
});

      } else if (currentQuestion.answerType === "open-ended") {
        const input = document.getElementById("writtenAnswer").value.trim();
        const wordCount = input.split(/\s+/).filter(Boolean).length; // Count non-empty words
        const minWords = currentQuestion.minWordCount || 50; // Default minimum words

        if (wordCount >= minWords) {
          result.classList.add("alert-success");
          result.textContent = `✅ Answer submitted! Word count: ${wordCount}`;
          console.log("📤 Evaluation payload:", {
  userId,
  mode: "writing",
  transcript: currentQuestion.answerType === "spoken-response"
    ? "This is a placeholder transcript"
    : document.getElementById("writtenAnswer")?.value.trim()
});
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
  result.classList.add("alert-warning");
  result.textContent = "Please select an answer.";
  return;
}

if (!currentQuestion.correctAnswer) {
  console.warn("⚠️ Missing correctAnswer for:", currentQuestion.id, currentQuestion.questionText);
}

const normalize = (str) => str.trim().toLowerCase();
const isCorrect = normalize(selected.value) === normalize(currentQuestion.correctAnswer);

        reviewLog.push({
          question: currentQuestion.questionText,
          userAnswer: selected.value,
          correctAnswer: currentQuestion.correctAnswer,
          correct: isCorrect
});
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
        const reviewList = document.getElementById("reviewList");
        reviewList.innerHTML = "";
        
        reviewLog.forEach((entry, i) => {
          const li = document.createElement("li");
          li.className = `list-group-item ${entry.correct === true
            ? "list-group-item-success"
            : entry.correct === false
            ? "list-group-item-danger"
            : "list-group-item-secondary"}`;
            
li.innerHTML = `
<strong>Q${i + 1}:</strong> ${entry.question}<br>
<strong>Your Answer:</strong> ${entry.userAnswer}<br>
${entry.correctAnswer ? `<strong>Correct Answer:</strong> ${entry.correctAnswer}` : ""}
`;

  reviewList.appendChild(li);
});

document.getElementById("reviewSection").classList.remove("d-none");

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

      const name = document.getElementById("nameInput")?.value.trim() || "Student";
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
      const filename = `CEFR_Review_${name}_${today}.pdf`;
      document.getElementById("watermarkText").textContent = `${name} • ${today}`;

      // Show review section during PDF export    
      const reviewSection = document.getElementById("reviewSection");
      const wasHidden = reviewSection.classList.contains("d-none");
      if (wasHidden) reviewSection.classList.remove("d-none");

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

        pdf.save(filename); // Save the PDF

        if (wasHidden) reviewSection.classList.add("d-none");

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
    
    window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nameInput").focus();
  document.getElementById("summaryCard").classList.add("d-none"); // 💥 Forces hidden
  document.getElementById("quizCard").classList.add("d-none");    // Just in case it's visible
  document.getElementById("result").classList.add("d-none");
});

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
}
