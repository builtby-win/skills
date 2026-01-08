---
description: Review, edit, and publish draft blog posts
---

# Blog

Dashboard for all your blog posts. View, search, add content, and publish.

## What it does

1. Shows all posts (drafts and published) in a dashboard
2. Fuzzy search to find posts by name, tags, or filename
3. Add content to existing posts from any repo
4. Expand, edit, publish, or delete posts

## Usage

```bash
/blog              # Dashboard - see all posts
/blog <query>      # Find a specific post (fuzzy search)
```

## Examples

```bash
/blog              # Show dashboard of all posts
/blog tauri        # Find posts matching "tauri"
/blog javascript   # Find posts with "javascript" in title/tags
```

## When to use

- **Dashboard** (`/blog`): End of day review, see what's pending
- **Quick add** (`/blog <query>`): Add learnings to a post from any repo
- **Publish**: When a draft is ready to go live
- **Edit**: Polish content before publishing

## Actions

After selecting a post:

**For drafts:**
- Add content - Append new learnings
- Expand - Flesh out with more detail
- Edit - Make specific changes
- Publish - Set live
- Delete - Remove draft

**For published posts:**
- Add content - Append updates
- Edit - Make changes
- Unpublish - Hide from site

## Configuration

Add to your `CLAUDE.md`:

```markdown
BLOG_CONTENT_DIR=/path/to/your/blog/content
```

Example: `BLOG_CONTENT_DIR=/Users/you/portfolio/src/content/blog`
