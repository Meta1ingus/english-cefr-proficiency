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

### 🐍 Python Validation

- ✅ `main.py` and `db_utils.py` reviewed for syntax and logic
- ✅ Pydantic models used for request validation
- ✅ SQL queries scoped and parameterized
- ✅ Field naming (`question_id`, `userId`) matches frontend expectations
- ✅ Error handling and response formatting confirmed

📷 *Placeholder for screenshot of Python linting or test output*

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