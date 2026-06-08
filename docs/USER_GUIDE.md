# Resume Tailor User Guide

This guide explains how to use Resume Tailor from first setup through generating and managing targeted application packets.

## What Resume Tailor does

Resume Tailor helps you reuse one accurate resume profile for many job applications.

Instead of manually rewriting your resume for every posting, you:

1. enter your background once,
2. paste a job description,
3. choose how aggressive the rewrite should be,
4. generate a tailored resume, cover letter, and Workday helper script,
5. review everything before applying.

The app is designed for job seekers who want faster tailoring without inventing fake experience.

## Important safety note

AI-generated job materials must be reviewed before use.

Resume Tailor is designed to preserve facts from your saved profile, but you are still responsible for checking that every generated claim is true, accurate, and appropriate for the role.

Use **Strong** rewrite mode only when you are willing to review the output carefully.

## First-time setup

### 1. Open the app

Run the app locally and open it in your browser.

If you are running from the project folder:

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```txt
http://localhost:5173/
```

### 2. Configure your AI provider

Go to **Settings**.

In the **AI provider** card:

1. Choose a provider.
2. Choose a model.
3. Paste your API key.
4. Click **Save API key**.
5. Click **Test connection**.

If the test succeeds, the app is ready to generate.

If the test fails, check:

- the API key is correct,
- the selected model is available for that key,
- the provider account has billing/credits enabled,
- your network is not blocking provider requests.

### 3. Choose generation preferences

Still on **Settings**, choose:

#### Rewrite mode

- **Light** — safest option. Uses minimal edits and preserves more original wording.
- **Balanced** — recommended default. Rewrites and reorders bullets while keeping claims grounded.
- **Strong** — most aggressive. Can improve alignment, but must be reviewed carefully.

#### Cover letter tone

- **Professional** — formal, direct, polished.
- **Conversational** — warmer and more natural.
- **Technical** — emphasizes tools, systems, and technical detail.

These preferences are saved locally and used for future generations.

## Building your profile in My Experience

Go to **My Experience**.

This page is your resume source of truth. It is not the final formatted resume. It is the structured profile that Resume Tailor uses to generate targeted materials. You can collapse sections, clear sections, and temporarily omit entries from generated outputs without deleting them.

### Profile strength

At the top of the page, the app shows profile strength. A stronger profile gives the AI more accurate material to work with.

Aim for at least 50% before serious applications.

The app looks for things like:

- name and email,
- work experience,
- concrete bullet points,
- skills,
- projects or certifications.

### Personal Info

Fill out your contact basics:

- Name
- Email
- Phone
- LinkedIn
- GitHub

Tips:

- Use the email and phone number you want employers to see.
- Include LinkedIn/GitHub if they are polished and relevant.
- Keep links clean and professional.

### Work Experience

Add internships, jobs, freelance work, volunteer work, campus roles, or relevant part-time work.

For each role, include:

- job title,
- company,
- location,
- dates,
- bullet points.

Good bullets usually include:

- what you did,
- what tools or methods you used,
- what result or impact it had.

Examples:

```txt
Built a React dashboard that reduced manual reporting time by 40%.
Automated CSV cleanup with Python scripts, saving the team 3 hours per week.
Created REST API endpoints in Node.js for user profile updates and validation.
```

Avoid vague bullets like:

```txt
Worked on projects.
Helped the team.
Used computers.
```

### Projects

Projects are especially useful for students, new grads, and career switchers.

Add projects that show real skills:

- web apps,
- automation tools,
- AI tools,
- class projects,
- GitHub projects,
- deployed demos,
- data analysis projects.

For each project, include:

- project name,
- tech stack,
- link if available,
- bullet points explaining what you built and why it matters.

### Education

Add school, degree, field of study, GPA if you want to include it, and dates.

If GPA is weak or not relevant, leave it blank.

### Skills

List skills comma-separated.

Include a mix of:

- programming languages,
- frameworks,
- libraries,
- databases,
- cloud platforms,
- developer tools,
- AI/automation tools,
- business or collaboration tools if relevant.

Example:

```txt
Python, JavaScript, React, Node.js, SQL, Git, Tailwind CSS, REST APIs, Azure, n8n, LangChain
```

Tips:

- Only list skills you can discuss in an interview.
- Put stronger and more relevant skills first.
- Avoid padding the list with unrelated buzzwords.

### Certifications

Add certifications such as:

- Microsoft AZ-900,
- Microsoft AI-900 / AI-102 / AI-901,
- AWS Cloud Practitioner,
- Google certificates,
- course certificates worth showing.

If a certification is in progress, mark it clearly in the name or date if the app supports it.

### Languages

Add languages you can use professionally or conversationally.

Use the proficiency selectors honestly.

### Websites

Add portfolio, GitHub, LinkedIn, personal site, demos, or other professional links.

Only include links you would be comfortable with a recruiter opening.

## Backing up and moving your profile

On **My Experience**, use:

- **Export JSON** to download your profile data.
- **Import JSON** to restore a profile from a previous export.

Recommended backup habit:

- Export JSON after major profile updates.
- Store the file somewhere safe.
- Export again before clearing browser data or switching devices.

The JSON export is useful because browser `localStorage` is device/browser-specific.

## Generating an application packet

Go to **Tailor**.

### 1. Check the first-run checklist

The checklist helps you catch missing setup before generating.

It checks for:

- API key saved,
- contact basics,
- work bullets,
- skills library,
- projects or certifications,
- profile strength of at least 50%.

You can still experiment before everything is perfect, but better source data creates better outputs.

### 2. Paste the job description

Paste the full job posting into **Job description**.

Include as much useful context as possible:

- responsibilities,
- qualifications,
- tech stack,
- company/team details,
- preferred skills,
- seniority level.

Do not paste private or sensitive information that should not go to the selected AI provider.

### 3. Add job title and company

Enter the job title and company if you know them. These fields help label saved versions and personalize the cover letter.

### 4. Generate

Click **Generate tailored packet**.

The app runs through these steps:

1. Build base resume
2. Tailor with AI
3. Write cover letter
4. Prepare Workday script

When generation finishes, the output tabs appear and the result is saved to **Versions**. If provider usage data is available, the app also shows an estimated API cost. You can regenerate only the cover letter from the output area if the first version is not the right tone.

## Reviewing generated output

Always review before using the generated materials.

### Resume review checklist

Check that:

- your name and contact info are correct,
- company names and job titles are accurate,
- dates are accurate,
- bullets do not invent experience,
- technical claims are true,
- keywords match the job naturally,
- formatting is valid LaTeX,
- the resume still sounds like you.

### Cover letter review checklist

Check that:

- the company and role are correct,
- the tone fits the application,
- no facts are invented,
- it does not sound too generic,
- it is not too long,
- it has a clear reason why you fit the role.

If the cover letter is close but not right, use **Regenerate** on the cover-letter output instead of rerunning the whole packet.

### Workday script review checklist

Before using a generated Workday helper script:

- read the script,
- verify the data it will fill,
- use it only on pages you trust,
- stop if the form fields do not match what the script expects.

## Using Versions

Go to **Versions** to see saved generations.

Each saved version includes:

- date/time,
- job title,
- company,
- job description preview,
- generated outputs,
- rewrite mode metadata,
- cover-letter tone metadata,
- estimated API cost when available.

You can:

- open a saved version,
- copy/download outputs,
- delete one saved version,
- clear all history,
- filter by company or role.

Versions are stored locally in the current browser.

## Clearing local data

Go to **Settings** and click **Clear all local data**.

This deletes locally stored:

- resume profile,
- generation history,
- API keys,
- provider/model preferences,
- rewrite/tone preferences,
- onboarding status.

Before clearing data, export your resume JSON from **My Experience** if you want a backup.

## Recommended workflow for a real job application

1. Update **My Experience** with your latest facts.
2. Export a JSON backup.
3. Go to **Settings** and choose **Balanced** rewrite mode.
4. Paste the job posting into **Tailor**.
5. Generate the packet.
6. Review the resume line by line.
7. Review the cover letter and adjust voice/details.
8. Open/download the LaTeX resume and check formatting.
9. Save the final application materials somewhere organized.
10. Use **Versions** if you need to reopen the generated packet later.

## Troubleshooting

### Generate button is disabled

Common causes:

- no job description pasted,
- no API key saved,
- profile completeness is too low,
- generation is already running.

### API key will not save or test fails

Check:

- the key is pasted without extra spaces,
- the correct provider is selected,
- the selected model exists for your account,
- billing/credits are enabled,
- the provider service is available,
- your browser/network allows the request.

### My profile disappeared

Possible causes:

- browser localStorage was cleared,
- you switched browsers,
- you switched devices,
- you used private/incognito mode,
- you clicked **Clear all local data**.

Restore from an exported JSON backup if you have one.

### Versions are empty

Versions only appear after a successful generation. They are stored in the current browser only.

### Output seems inaccurate

Use a safer setting:

- switch rewrite mode from **Strong** to **Balanced** or **Light**,
- improve source bullets in **My Experience**,
- paste a more complete job description,
- regenerate,
- manually edit final output before sending.

## Best practices

- Keep your profile factual and specific.
- Add numbers where true: users, revenue, hours saved, percentage improvements, etc.
- Export JSON backups regularly.
- Use dedicated API keys with spending limits.
- Review generated claims carefully.
- Do not paste confidential job postings or private information unless you are comfortable sending it to the selected provider.
- Treat Workday helper scripts as best-effort automation. Review fields before saving anything on an employer site.
- Treat the app as a drafting assistant, not a final authority.
