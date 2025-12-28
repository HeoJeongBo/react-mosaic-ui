# FSD (Feature-Sliced Design) Architecture Guide

## Overview

FSD is an architectural methodology for structuring frontend projects to be scalable and maintainable.

## Core Concepts

### 1. Layers
Projects consist of standardized layers:

```
src/
├── app/          # Layer 1: Application
├── processes/    # Layer 2: Processes (optional)
├── pages/        # Layer 3: Pages
├── widgets/      # Layer 4: Widgets
├── features/     # Layer 5: Features
├── entities/     # Layer 6: Entities
└── shared/       # Layer 7: Shared
```

### 2. Slices
Each layer is divided into slices by business domain:

```
features/
├── auth/              # Slice: Authentication
├── product-search/    # Slice: Product search
└── add-to-cart/       # Slice: Add to cart
```

### 3. Segments
Each slice consists of segments by purpose:

```
auth/
├── ui/        # UI components
├── model/     # Business logic, state
├── api/       # API requests
└── lib/       # Helper functions
```

## Layer Details

### 1️⃣ App
Global application settings and initialization

```
app/
├── providers/              # Provider components
│   ├── router.tsx
│   ├── store.tsx
│   └── theme.tsx
├── styles/                 # Global styles
│   └── global.css
└── app.tsx                 # Root component
```

**Purpose**:
- Router configuration
- Global state management providers
- Global styles
- Error boundaries

**Example**:
```typescript
// app/providers/router.tsx
export const RouterProvider = ({ children }: PropsWithChildren) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};
```

### 2️⃣ Processes (Optional)
Complex business processes spanning multiple pages

```
processes/
└── checkout/
    ├── ui/
    └── model/
```

**Purpose**:
- Multi-step checkout processes
- Onboarding flows
- Complex user journeys

### 3️⃣ Pages
Pages with 1:1 mapping to routes

```
pages/
├── home/
│   └── ui/
│       └── home-page.tsx
├── product-detail/
│   └── ui/
│       └── product-detail-page.tsx
└── user-profile/
    └── ui/
        └── user-profile-page.tsx
```

**Purpose**:
- Page layout composition
- Combining widgets and features
- Page-level data fetching

**Example**:
```typescript
// pages/home/ui/home-page.tsx
import { Header } from '@/widgets/header';
import { ProductList } from '@/widgets/product-list';
import { ProductSearch } from '@/features/product-search';

export const HomePage = () => {
  return (
    <div>
      <Header />
      <ProductSearch />
      <ProductList />
    </div>
  );
};
```

### 4️⃣ Widgets
Independent and reusable UI blocks

```
widgets/
├── header/
│   ├── ui/
│   │   ├── header.tsx
│   │   └── navigation.tsx
│   └── model/
├── footer/
│   └── ui/
└── sidebar/
    └── ui/
```

**Purpose**:
- Header, Footer, Sidebar
- Complex UI sections
- Combining features and entities

**Example**:
```typescript
// widgets/header/ui/header.tsx
import { Logo } from '@/shared/ui/logo';
import { AuthButton } from '@/features/auth';
import { SearchBar } from '@/features/product-search';

export const Header = () => {
  return (
    <header>
      <Logo />
      <SearchBar />
      <AuthButton />
    </header>
  );
};
```

### 5️⃣ Features
User interactions providing business value

```
features/
├── auth/
│   ├── ui/
│   │   ├── login-form.tsx
│   │   └── logout-button.tsx
│   ├── model/
│   │   └── auth-store.ts
│   └── api/
│       └── auth-api.ts
├── add-to-cart/
│   ├── ui/
│   │   └── add-to-cart-button.tsx
│   └── model/
└── product-search/
    ├── ui/
    └── model/
```

**Purpose**:
- User actions (login, like, add to cart)
- Features with business logic

**Characteristics**:
- Actions users can perform
- Can use entities

**Example**:
```typescript
// features/add-to-cart/ui/add-to-cart-button.tsx
import { Product } from '@/entities/product';
import { useCart } from '../model/use-cart';

interface AddToCartButtonProps {
  product: Product;
}

export const AddToCartButton = ({ product }: AddToCartButtonProps) => {
  const { addItem } = useCart();

  return (
    <button onClick={() => addItem(product)}>
      Add to cart
    </button>
  );
};
```

### 6️⃣ Entities
Representation of business entities

```
entities/
├── user/
│   ├── ui/
│   │   ├── user-card.tsx
│   │   └── user-avatar.tsx
│   ├── model/
│   │   ├── user.types.ts
│   │   └── user-store.ts
│   └── api/
│       └── user-api.ts
├── product/
│   ├── ui/
│   ├── model/
│   └── api/
└── order/
    ├── ui/
    ├── model/
    └── api/
```

**Purpose**:
- Business domain entities
- Entity-related UI components
- Entity state management

**Characteristics**:
- No business logic (pure representation)
- Can use other entities
- Used by features

**Example**:
```typescript
// entities/user/ui/user-card.tsx
import { User } from '../model/user.types';

interface UserCardProps {
  user: User;
}

export const UserCard = ({ user }: UserCardProps) => {
  return (
    <div>
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};
```

### 7️⃣ Shared
Reusable common code

```
shared/
├── ui/                    # UI Kit
│   ├── button/
│   ├── input/
│   └── modal/
├── lib/                   # Utilities
│   ├── format-date.ts
│   └── validate-email.ts
├── api/                   # API client
│   └── base-api.ts
├── config/                # Configuration
│   └── app-config.ts
└── types/                 # Common types
    └── common.types.ts
```

**Purpose**:
- UI Kit (Button, Input, Modal)
- Utility functions
- Common types
- API client configuration

**Characteristics**:
- Cannot import other layers
- No business logic
- Used across entire project

**Example**:
```typescript
// shared/ui/button/button.tsx
interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ onClick, children, variant = 'primary' }: ButtonProps) => {
  return (
    <button className={`button button--${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

## Dependency Rules

### Import Rules
```
app → processes → pages → widgets → features → entities → shared
```

**✅ Allowed**:
```typescript
// Using widgets, features, entities in pages
import { Header } from '@/widgets/header';
import { ProductCard } from '@/entities/product';

// Using entities in features
import { User } from '@/entities/user';
```

**❌ Prohibited**:
```typescript
// Using features in entities (upper layer)
import { AddToCartButton } from '@/features/add-to-cart'; // ❌

// Using other layers in shared
import { User } from '@/entities/user'; // ❌

// Cross-imports within same layer
// In features/auth
import { AddToCartButton } from '@/features/add-to-cart'; // ❌
```

## Public API

Each slice provides a Public API through `index.ts`:

```typescript
// features/auth/index.ts
export { LoginForm } from './ui/login-form';
export { LogoutButton } from './ui/logout-button';
export { useAuth } from './model/use-auth';
export type { AuthState } from './model/auth.types';

// External usage
import { LoginForm, useAuth } from '@/features/auth';
```

## Real-World Example

### E-commerce Project Structure

```
src/
├── app/
│   ├── providers/
│   │   ├── router.tsx
│   │   └── store.tsx
│   └── app.tsx
│
├── pages/
│   ├── home/
│   │   └── ui/home-page.tsx
│   ├── product-detail/
│   │   └── ui/product-detail-page.tsx
│   └── cart/
│       └── ui/cart-page.tsx
│
├── widgets/
│   ├── header/
│   │   └── ui/header.tsx
│   ├── product-list/
│   │   └── ui/product-list.tsx
│   └── cart-summary/
│       └── ui/cart-summary.tsx
│
├── features/
│   ├── auth/
│   │   ├── ui/
│   │   ├── model/
│   │   └── api/
│   ├── add-to-cart/
│   │   ├── ui/add-to-cart-button.tsx
│   │   └── model/use-cart.ts
│   └── product-filter/
│       ├── ui/filter-panel.tsx
│       └── model/filter-store.ts
│
├── entities/
│   ├── user/
│   │   ├── ui/user-card.tsx
│   │   ├── model/user.types.ts
│   │   └── api/user-api.ts
│   ├── product/
│   │   ├── ui/product-card.tsx
│   │   ├── model/product.types.ts
│   │   └── api/product-api.ts
│   └── order/
│       ├── ui/order-item.tsx
│       └── model/order.types.ts
│
└── shared/
    ├── ui/
    │   ├── button/
    │   ├── input/
    │   └── modal/
    ├── lib/
    │   ├── format-price.ts
    │   └── format-date.ts
    └── api/
        └── base-api.ts
```

## Layer Selection Decision Tree

```
Where should new code go?

1. Is it reusable UI or utility?
   → YES: shared/

2. Is it a business entity representation?
   → YES: entities/

3. Is it a user action/feature?
   → YES: features/

4. Is it a large UI block combining multiple features?
   → YES: widgets/

5. Is it a full page layout?
   → YES: pages/

6. Is it global configuration?
   → YES: app/
```

## Checklist

When adding new features:

- [ ] Have you chosen the appropriate layer?
- [ ] Are you violating dependency rules?
- [ ] Are you exporting through Public API?
- [ ] Are there cross-imports within the same layer?
- [ ] Are there circular dependencies?
- [ ] Is the file structure divided into segments (ui, model, api, lib)?
