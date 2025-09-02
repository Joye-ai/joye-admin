# Source Code Structure

This directory contains the main source code for the Joye Admin application.

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
│   ├── ui/                # Basic UI components
│   ├── forms/             # Form components
│   └── layout/            # Layout components
├── constants/             # Application constants
│   ├── index.ts          # Main constants
│   └── routes.ts         # Route definitions
├── helpers/              # Helper functions
│   ├── auth.ts           # Authentication helpers
│   ├── format.ts         # Formatting helpers
│   ├── validation.ts     # Validation helpers
│   ├── storage.ts        # Storage helpers
│   ├── api.ts            # API helpers
│   ├── navigation.ts     # Navigation helpers
│   └── index.ts          # Re-exports
├── types/                # TypeScript type definitions
│   ├── common.ts         # Common types
│   ├── auth.ts           # Authentication types
│   ├── user.ts           # User management types
│   ├── api.ts            # API types
│   ├── ui.ts             # UI component types
│   └── index.ts          # Re-exports
├── utils/                # Utility functions
│   ├── common.ts         # Common utilities
│   ├── date.ts           # Date utilities
│   ├── string.ts         # String utilities
│   ├── array.ts          # Array utilities
│   ├── object.ts         # Object utilities
│   ├── number.ts         # Number utilities
│   ├── url.ts            # URL utilities
│   ├── file.ts           # File utilities
│   └── index.ts          # Re-exports
├── config/               # Configuration files
│   └── index.ts          # App configuration
├── lib/                  # Library exports
│   └── index.ts          # Common exports
└── hooks/                # Custom React hooks
```

## Usage

### Constants

```typescript
import { API_ENDPOINTS, ROUTES } from "@/constants";
```

### Helpers

```typescript
import { formatHelpers, validationHelpers } from "@/helpers";
```

### Types

```typescript
import { User, ApiResponse } from "@/types";
```

### Utils

```typescript
import { debounce, formatDate, capitalize } from "@/utils";
```

### Config

```typescript
import { config } from "@/config";
```

## Import Aliases

All imports use the `@/` alias which points to the `src/` directory:

- `@/constants` → `src/constants`
- `@/helpers` → `src/helpers`
- `@/types` → `src/types`
- `@/utils` → `src/utils`
- `@/config` → `src/config`
- `@/lib` → `src/lib`
