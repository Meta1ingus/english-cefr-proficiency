# CEFR English Proficiency Quiz

An interactive web application designed to help users assess their English proficiency level based on the CEFR framework. The quiz provides immediate feedback, visual summaries, and CEFR badge indicators to support self-evaluation and learning.

---

## 📚 Table of Contents

- [🎯 Purpose & Value](#-purpose--value)  
- [🧩 Features](#-features)  
- [🛠️ Technologies Used](#-technologies-used)  
- [📁 Project Structure](#-project-structure)  
- [✅ Validation & Testing](#-validation--testing)  
- [🚀 Deployment](#-deployment)  
- [📚 Attribution](#-attribution)  
- [🧠 Development Notes](#-development-notes)  
- [🗂️ Version Control](#-version-control)

---

## 🎯 Purpose & Value

This project aims to:
- Provide a user-friendly, accessible quiz interface
- Offer immediate feedback and CEFR-level summaries
- Support learners in identifying strengths and areas for improvement
- Demonstrate frontend development skills using HTML, CSS, and JavaScript

---

## 🧩 Features

- Responsive layout using Bootstrap 5
- Dynamic feedback with visual indicators (`correct`, `incorrect`)
- CEFR badge assignment based on quiz performance
- Toggleable rubric for self-assessment
- PDF export of results using `html2canvas` and `jsPDF`

---

## 🛠️ Technologies Used

- HTML5, CSS3, JavaScript (ES6)
- Bootstrap 5 (CDN)
- jsPDF & html2canvas (via CDN)
- GitHub Pages for deployment

---

 ## 📁 Project Structure

- english-cefr-proficiency/
  - index.html
  - js/
    - app.js
    - config.js
  - public/
    - audio/
    - css/
        - style.css
  - README.md

---

## ✅ Validation & Testing

This project has been manually and externally validated for compliance, performance, and accessibility. Below are the key checks performed:

---

### 🔍 HTML Validation

- ✅ Validated using [W3C HTML Validator](https://validator.w3.org/)
- ✅ Confirmed semantic structure and proper tag nesting
- ✅ Removed trailing slashes from void elements (`<meta>`, `<link>`, `<input>`, `<img>`)
- ✅ Added `aria-live="polite"` to dynamic heading for accessibility
- ✅ Provided fallback `src` for hidden `<img>` to avoid broken rendering

📷 *Placeholder for screenshot of W3C HTML Validator results*

---

### 🎨 CSS Validation

- ✅ Validated using [W3C CSS Validator](https://jigsaw.w3.org/css-validator/)
- ✅ Confirmed syntax correctness and responsive layout
- ✅ No deprecated properties or orphaned selectors
- ✅ Externalized into `public/css/style.css` for maintainability

📷 *Placeholder for screenshot of CSS Validator results*

---

### 🧠 JavaScript Validation

- ✅ Validated using [Workik Code Syntax Validator](https://workik.com/code-syntax-validator)
- ✅ ES6+ syntax confirmed: `async/await`, arrow functions, destructuring
- ✅ Module imports (`config.js`) handled correctly
- ✅ Event listeners scoped and attached cleanly
- ✅ No unused variables or runtime errors

📷 *Placeholder for screenshot of JS validation output*

---

### 🐍 Python Validation (main.py)

The `main.py` backend was validated using [AIpy Python Code Checker](https://aipy.dev/tools/python-code-checker). Key findings:

#### ✅ Syntax & Style
- No syntax errors detected — code is executable and clean.
- Follows PEP8 conventions with minor suggestions:
  - Consider moving `clean()` and `EvaluationRequest` to separate utility modules.
  - Rename generic variables like `result` for clarity.

#### ✅ Best Practices
- Uses `JSONResponse` for structured error handling.
- Database connections managed via context manager (`with get_connection()`).
- Pydantic models enforce input validation and maintain contract integrity.
- Separation of concerns between API logic and database utilities is well maintained.

#### ⚙️ Performance Considerations
- Backend queries are functional but could benefit from:
  - Caching frequently accessed data (e.g. rubrics, questions).
  - Pagination for large datasets.
  - Async processing for `transcribe_with_huggingface()` to reduce latency.

#### 🔐 Security Review
- Basic input validation is in place, but could be expanded to:
  - Sanitize and validate all incoming fields (e.g. user ID, question ID).
  - Harden file upload logic (type checks, size limits, filename sanitization).
  - Add authentication and role-based access control.

#### 🧪 Suggested Improvements
- Refactor utility functions into dedicated modules for maintainability.
- Implement caching and async logic for performance.
- Expand input validation and error logging.
- Add unit tests for evaluation logic and DB interactions.

📷 *Placeholder for screenshot of AIpy validation results*

---

### 🐍 Python Validation (db_utils.py)

The `db_utils.py` module was validated using [AIpy Python Code Checker](https://aipy.dev/tools/python-code-checker). Key findings:

#### ✅ Syntax & Style
- No syntax errors detected — code is executable and clean.
- Follows PEP8 conventions with minor suggestions:
  - Some SQL query lines exceed the 79-character limit.
  - Inconsistent naming: `get_db_connection()` vs. `get_connection()`.
  - Functions lack descriptive docstrings for clarity and maintainability.

#### ✅ Best Practices
- Uses parameterized SQL queries to prevent injection risks.
- Loads environment variables securely via `dotenv`.
- Separation of concerns is mostly respected, though `get_all_questions()` handles both fetching and processing — consider splitting.
- Suggest adding logging statements for better debugging and monitoring.

#### ⚙️ Performance Considerations
- Multiple queries in `get_all_questions()` and `get_user_responses()` could be optimized:
  - Add pagination for large datasets.
  - Consider offloading data processing to a separate service or module.
  - Review SQL joins and column selection for efficiency.

#### 🔐 Security Review
- SQL injection risk mitigated via parameterized queries.
- Environment variables used for DB credentials — ensure `.env` is excluded from version control.

#### 🧪 Suggested Improvements
- Split `get_all_questions()` into fetch and process layers.
- Catch specific exceptions (e.g. `psycopg2.Error`) for clearer error handling.
- Add detailed docstrings to all functions.
- Implement pagination and query optimization.
- Add structured logging for monitoring and debugging.
- Ensure all dependencies (e.g. `dotenv`) are documented and managed via `requirements.txt`.

📷 *Placeholder for screenshot of AIpy validation results*

---

### 🧪 Manual Testing

- ✅ Verified layout responsiveness across devices
- ✅ Confirmed CEFR badge logic and rubric toggle
- ✅ Tested PDF export using `html2canvas` and `jsPDF`
- ✅ Backend integration tested via fetch calls and response handling

📷 *Placeholder for screenshot of quiz in action or CEFR badge display*

---

## 🚀 Deployment

The project is deployed via GitHub Pages:  
[Live Demo](https://meta1ingus.github.io/english-cefr-proficiency/)

---

## 📚 Attribution

- Bootstrap 5: [https://getbootstrap.com](https://getbootstrap.com)
- jsPDF: [https://github.com/parallax/jsPDF](https://github.com/parallax/jsPDF)
- html2canvas: [https://github.com/niklasvh/html2canvas](https://github.com/niklasvh/html2canvas)

All external libraries are used via CDN and attributed above. Inline comments in `app.js` and `index.html` identify any externally sourced code snippets.

---

## 🧠 Development Notes

- CSS and JS are separated into external files for maintainability
- Code is linted and validated to meet assessment standards
- File naming and folder structure follow cross-platform conventions

---

## 🗂️ Version Control

Version control is managed via Git and GitHub. Commit messages reflect feature additions, bug fixes, and structural changes.

---