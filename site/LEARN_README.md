# OpenConstruction Learn Plan

This document defines the near-term direction for the OpenConstruction Learn section. The goal is to make learning easy to enter, useful for construction data authors, and strong enough to support certificates, workshops, and university adoption.

## Information Architecture

The top navigation should use one dropdown named **Learn** with four dedicated pages:

- **Academy** (`academy.html`)  
  A short free course for publishing reusable, FAIR, and AI-ready construction datasets.

- **Tutorials** (`tutorials.html`)  
  Practical walkthroughs and Q&A for using the OpenConstruction platform.

- **Guides & Toolkits** (`guides-toolkits.html`)  
  Checklists, templates, rubrics, workshop materials, and instructor adoption assets.

- **References** (`references.html`)  
  Schema, existing guides, standards, and external references.

The old `learn.html` page should remain as a noindex compatibility redirect to `academy.html`.

## Academy Page

### Purpose

Academy should attract users to the course and make the value obvious in the first screen. It should not feel like a generic research data management course. The emphasis is construction data: site imagery, videos, BIM, point clouds, geospatial data, safety observations, equipment logs, annotations, privacy, licensing, repositories, metadata, and AI-ready reuse.

### Primary Audience

- Graduate students preparing thesis or research datasets.
- Faculty teaching construction technology, BIM, AI/computer vision, research methods, or thesis orientation.
- Researchers and lab teams preparing datasets for publication.
- Dataset contributors who want their resources accepted into OpenConstruction.
- Workshop participants improving their own construction data.

### Page Requirements

- Clear introduction in plain language.
- Learning outcomes near the top.
- One featured video preview.
- Certificate preview as the engagement mechanism.
- Short module cards with duration and practical output.
- “No sign-in required to watch” message.
- “Sign in only for progress, assessment, certificate, or contribution” message.
- University adoption and workshop positioning.

### Featured Academy Video

Use one flagship video for the first version:

**Title:** Licensing, Ethics & Responsible Sharing  
**Length:** 60-90 seconds  
**Format:** Animated explainer with light narration  
**Goal:** Help learners understand that open construction data is not just uploading files; it requires license clarity, privacy review, sensitive-site judgment, and reuse conditions.

Suggested production workflow:

- Use **Runway** for short conceptual animation clips such as a construction dataset moving through license, privacy, repository, and reuse checkpoints.
- Use **HeyGen** or **Synthesia** if a presenter/avatar explainer is preferred.
- Keep the first version simple: one animated intro, one voiceover, one closing checklist.

## Tutorials Page

### Purpose

Tutorials should help users complete platform tasks quickly. It should be a gallery of practical guides, supported by an expandable Q&A section.

### Page Requirements

- One featured tutorial video.
- Tutorial gallery with clear task cards.
- Q&A as expandable questions.
- Issue reporting should appear as one support tutorial, not as the main page focus.
- Each tutorial card should have a status such as Video, Step-by-step, Q&A, or Coming soon.

### Featured Tutorial Video

Use one flagship video for the first version:

**Title:** Submit a Dataset to OpenConstruction  
**Length:** 2-3 minutes  
**Format:** Screen walkthrough  
**Goal:** Show a user how to prepare basic metadata, open the submission flow, and understand what reviewers need.

Suggested production workflow:

- Use **Guidde** for screen-capture tutorial video with AI-generated narration, captions, callouts, and redaction.
- Use **Scribe** for a parallel step-by-step text guide if video production is delayed.
- Keep source scripts in the repository so videos can be regenerated when the UI changes.

## Certificate Strategy

The certificate should be visible before the course starts. It should function as a lightweight engagement mechanism rather than a barrier.

Recommended flow:

1. User watches modules without sign-in.
2. User signs in only to save progress or take the assessment.
3. User completes a short quiz and publishing checklist.
4. User receives an OpenConstruction Data Publisher certificate/badge.
5. Later, user can earn an applied badge by improving or publishing a real dataset.

## Video Scripts

### Academy Video Script: Licensing, Ethics & Responsible Sharing

Open construction data can create real value, but responsible sharing starts before upload. First, clarify who owns the data and what license allows others to do. Next, review privacy and safety risks: faces, license plates, site locations, sensitive infrastructure, and contractual restrictions. Then document consent, collection context, and known limitations so future users understand what the data can and cannot support. Finally, publish with clear metadata, access conditions, and citation guidance. Responsible sharing makes construction data more reusable, trustworthy, and useful for AI.

### Tutorial Video Script: Submit a Dataset to OpenConstruction

This tutorial shows how to submit a dataset to OpenConstruction. Start by preparing the dataset title, source link, authors, year, license, data type, tasks, and a short reuse-focused description. Then open the contribution page and choose submit resource. Select dataset as the resource type, enter the core metadata, and include links to the repository, DOI, paper, or project page. Add notes about privacy, access limits, annotation labels, and known issues. Before submitting, check that the license and contact information are clear. The review team uses this information to make the dataset easier to find, evaluate, and reuse.

## Maintenance Notes

- Keep video pages useful before real videos are produced by showing scripts, storyboards, and production status.
- Store final video assets under `site/assets/video/learn/` when available.
- Prefer short videos and reusable scripts over long webinars.
- Review Learn pages whenever the contribution workflow changes.
