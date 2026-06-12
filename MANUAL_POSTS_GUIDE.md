# Manual Posts Guide

Use this file when you want to add posts yourself and deploy directly.

## Add Posts

Edit:

```txt
src/data/manualPosts.ts
```

Copy one object inside `manualPosts` and change:

- `title`
- `slug`
- `description`
- `content`
- `source`
- `publishedAt`
- `image`
- `category`

Manual posts appear first on the homepage and news pages.

## Add Images

Put your images here:

```txt
public/post-images/
```

Then reference them in the post:

```ts
image: '/post-images/my-image.jpg'
```

You can also use a full online image URL.

## Deploy

After editing posts/images, run:

```bash
npm run build
npx vercel --prod --yes --scope ahmed-badrs-projects-9a019df6
```
