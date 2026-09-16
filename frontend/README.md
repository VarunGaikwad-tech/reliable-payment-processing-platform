# Payment Processing Platform

# Project Structure Generation Prompt

Use this prompt to generate a complete React TypeScript SaaS starter project structure Named Revio.

## Project Overview

Create a modern React + TypeScript SaaS application starter template with the following specifications:

## Project Structure

```
project-root/
├── public/
│   ├── images/
│   │   ├── common/          # Shared images (logo, blog images, footer patterns)
│   │   ├── company/         # Company page images (hero, team, investors, mission/vision)
│   │   ├── features/        # Features page images (charts, tabs)
│   │   ├── homepage/        # Homepage specific images (avatars, integrations, testimonials)
│   │   └── icons/           # SVG icons (arrow, bank, check, shield, wallet, etc.)
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── components/
│   │   ├── layout.tsx                    # Main layout wrapper (Navbar, Footer, CTA)
│   │   ├── seo.tsx                       # SEO component with Helmet
│   │   ├── sections/                     # Page-specific section components
│   │   │   ├── blog/                     # Blog sections (hero, list, featured, details)
│   │   │   ├── company/                  # Company page sections
│   │   │   ├── contact/                  # Contact page sections
│   │   │   ├── download/                 # Download page sections
│   │   │   ├── features/                 # Features page sections
│   │   │   ├── home/                     # Homepage sections
│   │   │   ├── legal/                    # Legal pages sections
│   │   │   ├── pricing/                  # Pricing page sections
│   │   │   ├── shared/                   # Shared sections (navbar, footer, container, cta)
│   │   │   │   └── navbar/
│   │   │   │       ├── index.ts
│   │   │   │       ├── navbar.tsx
│   │   │   │       └── nav-link.tsx
│   │   │   └── utility/                  # Utility pages (coming-soon)
│   │   └── ui/                           # shadcn/ui components
│   │       ├── motion/                   # Animation components
│   │       │   ├── animate-on-view.tsx
│   │       │   └── stagger.tsx
│   │
│   ├── pages/
│   │   ├── home.tsx
│   │   ├── company.tsx
│   │   ├── contact.tsx
│   │   ├── features.tsx
│   │   ├── download.tsx
│   │   ├── not-found.tsx
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── blog/
│   │   │   ├── index.tsx
│   │   │   └── [slug].tsx
│   │   ├── pricing/
│   │   │   ├── index.tsx
│   │   │   ├── starter.tsx
│   │   │   ├── pro.tsx
│   │   │   └── enterprise.tsx
│   │   ├── legal/
│   │   │   └── [page].tsx
│   │   └── utility/
│   │       └── coming-soon.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts                      # Utility functions (cn helper)
│   │   ├── data/
│   │   │   └── blog-posts.ts            # Blog post data/types
│   │   └── services/
│   │       └── blog-service.ts          # Blog service functions
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx               # Mobile breakpoint hook
│   │   └── use-toast.ts                 # Toast hook
│   │
│   ├── data/                             # JSON data files
│   │   ├── coin.json
│   │   ├── global-accessibility.json
│   │   ├── insights.json
│   │   ├── request-money.json
│   │   ├── revio-pay.json
│   │   ├── schudule.json
│   │   ├── security-first.json
│   │   ├── settled.json
│   │   ├── sheild.json
│   │   └── swap-your-payment.json
│   │
│   ├── App.tsx                           # Main app with routing
│   ├── App.css
│   ├── main.tsx                          # React DOM entry point
│   ├── index.css                         # Global styles & Tailwind config
│   └── vite-env.d.ts
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                       # shadcn/ui config
├── eslint.config.js
└── README.md

```

## Configuration Files

### tsconfig.json

```json
- Path mapping: "@/*" → "./src/*"
- Base URL: "."
- Relaxed TypeScript settings (noImplicitAny: false, etc.)

```

### tailwind.config.ts

```tsx
- Content paths: "./src/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"
- Font: 'Inter Tight', system-ui, sans-serif
- Custom colors via CSS variables (primary, secondary, muted, etc.)
- Custom Revio brand colors (violet, obsidian, charcoal, emerald, etc.)
- Custom spacing, borderRadius, animations (accordion, fade-in, scale-in, shimmer)
- Plugin: tailwindcss-animate

```

### index.css Structure

```css
- Tailwind base, components, utilities layers
- CSS custom properties for colors, gradients, shadows, spacing
- Typography classes (.h1, .h2, .h3, .h4, .h5, .h6, .paragraph-regular, etc.)
- Padding utilities (.banner-top-padding, .banner-bottom-padding)
- Component classes (.glass-card, .text-gradient, .glow-violet, .hover-lift)
- Animation utilities (.animate-float, .animate-pulse-glow)

```

## Key Patterns & Conventions

### Component Architecture

1. **Layout Component**: Wraps pages with Navbar, Footer, and CTA sections
2. **Container Component**: Provides consistent max-width and padding
3. **Page Components**: Import Layout, SEO, and compose section components
4. **Section Components**: Organized by page type in `components/sections/`
5. **UI Components**: shadcn/ui components in `components/ui/`

### Routing Structure

- Home: `/`
- Company: `/company`
- Features: `/features`
- Pricing: `/pricing`, `/pricing/starter`, `/pricing/pro`, `/pricing/enterprise`
- Blog: `/blog`, `/blog/:slug`
- Contact: `/contact`
- Download: `/download`
- Legal: `/legal/:page`
- Utility: `/coming-soon`
- Auth: `/login`, `/signup` (pages exist but routes may not be configured)
- 404:  → NotFound component

### SEO Pattern

Each page component should:

- Import and use `<SEO />` component
- Provide title, description, canonicalUrl
- Optionally provide ogType, ogImage, twitterCard
- Include JSON-LD structured data when appropriate

### Styling Patterns

- Use Tailwind utility classes
- Use `cn()` utility for conditional classes
- Follow custom typography classes (.h1, .h2, etc.)
- Use CSS variables for theming
- Responsive design with md:, lg: breakpoints

### Import Patterns

- Use `@/` alias for all src imports
- Absolute imports preferred over relative
- Example: `import { Button } from "@/components/ui/button"`

### Data Organization

- JSON data files in `src/data/` for static content
- TypeScript data/services in `src/lib/data/` and `src/lib/services/`
- Blog posts structure in `src/lib/data/blog-posts.ts`

## Required UI Components (shadcn/ui)

Include all standard shadcn/ui components:

- Form controls: button, input, label, textarea, select, checkbox, radio-group, switch, slider
- Data display: card, badge, avatar, separator, table, progress
- Navigation: navigation-menu, tabs, breadcrumb, pagination, menubar, sidebar
- Overlays: dialog, sheet, drawer, popover, tooltip, hover-card, alert-dialog, dropdown-menu
- Feedback: alert, toast, sonner, skeleton
- Layout: accordion, collapsible, resizable
- Advanced: carousel, command, context-menu, calendar, chart, input-otp, toggle, toggle-group
- Custom: blog-card, feature-card, testimonial-card
- Motion: animate-on-view, stagger (custom animation components)

## Key Features to Implement

1. **Responsive Navigation**: Desktop menu + mobile sheet/drawer
2. **SEO Optimization**: Helmet-based meta tags and JSON-LD
3. **Animation System**: Framer Motion integration
4. **Form Handling**: React Hook Form + Zod validation
5. **Toast Notifications**: Sonner integration
6. **Blog System**: List and detail pages with dynamic routing
7. **Pricing Plans**: Multiple pricing tiers with dedicated pages
8. **Legal Pages**: Dynamic legal page routing
9. **Utility Pages**: Coming soon page template
10. **Reusable Sections**: Modular section components

## Layout Component Structure

```tsx
- Navbar (absolute positioned, top of page)
- {children} (page content)
- CTA section (call-to-action)
- Footer

```

## Utility Functions

### lib/utils.ts

- `cn()` function using clsx and tailwind-merge for className merging

### Hooks

- `use-mobile.tsx`: Detects mobile breakpoint (768px)
- `use-toast.ts`: Toast notification hook

## Color System

The project uses a custom color palette defined via CSS variables:

- Primary: Violet (97 66 255)
- Background: White (255 255 255)
- Foreground: Dark (20 20 20)
- Custom Revio colors: obsidian, charcoal, violet, emerald, light variants
- Gradients: violet gradient, dark gradient, glass gradient
- Shadows: violet glow, card shadow, elevated shadow

## Typography System

Responsive typography classes:

- .h1: 36px → 54px → 68px (mobile → tablet → desktop)
- .h2: 32px → 48px → 60px
- .h3: 32px → 36px → 40px → 44px
- .h4: 28px → 30px → 32px → 36px
- .h5: 20px → 22px → 23px → 24px
- .h6: 18px → 20px → 21px → 22px
- Paragraph variants: regular, large, small

## Image Organization

Public images organized by section:

- `/images/common/` - Logo, shared blog images, footer patterns
- `/images/company/` - Company page assets (hero images, team photos, investor logos)
- `/images/features/` - Feature showcases and charts
- `/images/homepage/` - Homepage-specific assets
- `/images/icons/` - SVG icon library

## Additional Notes

1. **Type Safety**: Use TypeScript throughout, but with relaxed strict mode
2. **Component Exports**: Use default exports for pages, named exports for utilities
3. **File Naming**: kebab-case for files, PascalCase for components
4. **Responsive Design**: Mobile-first approach with Tailwind breakpoints
5. **Accessibility**: Include proper ARIA labels and semantic HTML
6. **Performance**: Code splitting via React Router, lazy loading where appropriate
7. **Development**: ESLint configured, lovable-tagger for component tagging in dev mode

---

## Generation Instructions

When generating this project:

1. Set up Vite + React + TypeScript template
2. Install all dependencies listed above
3. Configure all configuration files as specified
4. Create the complete folder structure
5. Implement the Layout, Container, and SEO components first
6. Set up routing in App.tsx
7. Create page components with proper structure
8. Implement section components for each page type
9. Include all shadcn/ui components
10. Set up the styling system with custom CSS variables and Tailwind config
11. Implement utility functions and hooks
12. Create sample data files and services
13. Ensure proper TypeScript types throughout
14. Configure path aliases and imports

This structure provides a solid foundation for a modern SaaS marketing website with blog functionality, pricing tiers, and multiple content pages.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9676845e-37e9-4890-a5a4-e76814ca4ee5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
