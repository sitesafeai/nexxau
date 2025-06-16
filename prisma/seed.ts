import { PrismaClient } from '@prisma/client';
import { slugify } from '@/lib/utils';

const prisma = new PrismaClient();

const blogPosts = [
  {
    title: "Top 10 PPE Mistakes Workers Still Make (And How to Prevent Them)",
    description: "Break down the most common PPE errors found on construction and industrial sites, like improper helmet fit or missing vests, and explain how tech like Nexxau can catch them instantly.",
    content: "Detailed content about PPE mistakes...",
    category: "Safety Tips",
    featured: true,
    status: "published",
    publishedAt: new Date(),
    slug: "top-10-ppe-mistakes",
    featuredImage: "https://res.cloudinary.com/dvab4kk60/image/upload/v1717890000/blog/ppe-mistakes.jpg"
  },
  {
    title: "How to Create a Safety-First Culture on Your Worksite",
    description: "Explore practical steps site managers can take to shift mindset, including daily briefings, visual reminders, and gamification using compliance tracking tools like Nexxau.",
    content: "Detailed content about safety culture...",
    category: "Safety Tips",
    featured: false,
    status: "published",
    publishedAt: new Date(),
    slug: "safety-first-culture",
    featuredImage: "https://res.cloudinary.com/dvab4kk60/image/upload/v1717890000/blog/safety-culture.jpg"
  },
  {
    title: "The Rise of AI in Construction Safety: What 2025 Will Look Like",
    description: "Review the latest developments in AI safety tools and where the industry is heading—highlight Nexxau's role in this larger transformation.",
    content: "Detailed content about AI in construction...",
    category: "Industry News",
    featured: true,
    status: "published",
    publishedAt: new Date(),
    slug: "ai-construction-safety-2025",
    featuredImage: "https://res.cloudinary.com/dvab4kk60/image/upload/v1717890000/blog/ai-construction.jpg"
  },
  {
    title: "OSHA's New Focus Areas for 2025: What Contractors Need to Know",
    description: "Summarize recent OSHA initiatives or emphasis programs, and how proactive firms can use Nexxau to stay ahead of regulatory changes.",
    content: "Detailed content about OSHA updates...",
    category: "Industry News",
    featured: false,
    status: "published",
    publishedAt: new Date(),
    slug: "osha-focus-areas-2025",
    featuredImage: "https://res.cloudinary.com/dvab4kk60/image/upload/v1717890000/blog/osha-updates.jpg"
  },
  {
    title: "How Computer Vision is Changing Worksite Safety Forever",
    description: "A deep dive into how object detection, AI, and real-time video analysis are enabling safer environments—include diagrams or visual examples of Nexxau in action.",
    content: "Detailed content about computer vision...",
    category: "Technology",
    featured: true,
    status: "published",
    publishedAt: new Date(),
    slug: "computer-vision-worksite-safety",
    featuredImage: "https://res.cloudinary.com/dvab4kk60/image/upload/v1717890000/blog/computer-vision.jpg"
  }
];

async function main() {
  console.log('Start seeding...');

  // Create a default admin user if it doesn't exist
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sitesafe.com' },
    update: {},
    create: {
      email: 'admin@sitesafe.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: 'hashed_password_here', // You'll need to hash this properly
    },
  });

  // Add blog posts
  for (const post of blogPosts) {
    const slug = slugify(post.title);
    await prisma.blogPost.upsert({
      where: { slug },
      update: {},
      create: {
        ...post,
        authorId: admin.id,
        slug,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 