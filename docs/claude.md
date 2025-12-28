# Claude Code Guide

## Project Overview

This is a TypeScript-based React project that adheres to **FSD (Feature-Sliced Design)** architecture pattern and **clean code principles**.

## Core Principles

### 1. File Naming Convention
- **Components**: `my-component.ts`, `my-component.tsx`
- **Test files**: `my-component.tt.ts`
- **Type definitions**: `my-component.types.ts`
- **Styles**: `my-component.styles.ts`
- Use **kebab-case**

### 2. FSD Architecture Pattern
The project follows this layer structure:

```
src/
├── app/          # Application initialization (providers, styles, routing)
├── processes/    # Complex business processes (optional)
├── pages/        # Page components
├── widgets/      # Large independent UI blocks
├── features/     # User scenarios providing business value
├── entities/     # Business entities
├── shared/       # Reusable components, utils, UI kit
```

### 3. Clean Code Principles
- **Single Responsibility Principle**: One function/component should have one responsibility
- **Clear Naming**: Variable/function names that reveal intent
- **Small Functions**: Keep functions under 20 lines
- **Immutability**: Prefer `const`, favor immutable patterns
- **Type Safety**: Minimize `any` usage, explicit type definitions

## Code Writing Checklist

### When Adding New Features
1. ✅ Choose appropriate FSD layer (features vs entities vs widgets)
2. ✅ Ensure file names use kebab-case
3. ✅ Write test files (`*.tt.ts`)
4. ✅ Separate type definition files (for complex cases)
5. ✅ Check for circular dependencies (upper layers only import lower layers)

### When Writing Components
```typescript
// ✅ Good
export const UserProfile = ({ userId }: UserProfileProps): JSX.Element => {
  // Business logic
  const user = useUser(userId);

  // Early return
  if (!user) return <UserProfileSkeleton />;

  // UI rendering
  return <div>{user.name}</div>;
};

// ❌ Bad
export const UserProfile = (props: any) => {
  const user = useUser(props.userId);
  if (user) {
    return <div>{user.name}</div>;
  } else {
    return <UserProfileSkeleton />;
  }
};
```

### When Writing Functions
```typescript
// ✅ Good: Clear naming, single responsibility
export const calculateTotalPrice = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

// ❌ Bad: Unclear naming, multiple responsibilities
export const calc = (data: any) => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].price * data[i].quantity;
    console.log(data[i]); // Side effect
  }
  return sum;
};
```

## FSD Layer Selection Guide

### Shared
- UI Kit components (Button, Input, Modal)
- Utils, helpers
- API client
- Type definitions

**Example**: `src/shared/ui/button/button.tsx`

### Entities
- Representation of business entities
- User, Product, Order, etc.

**Example**: `src/entities/user/ui/user-card.tsx`

### Features
- Features connected to user actions
- "Like", "Add to cart", "Login"

**Example**: `src/features/add-to-cart/ui/add-to-cart-button.tsx`

### Widgets
- Independent UI blocks
- Header, Footer, Sidebar

**Example**: `src/widgets/header/ui/header.tsx`

### Pages
- Pages with 1:1 mapping to routes

**Example**: `src/pages/home/ui/home-page.tsx`

## Dependency Rules

```
app → processes → pages → widgets → features → entities → shared
```

- Upper layers can only import lower layers
- Cross-imports within the same layer are prohibited
- Shared cannot import other layers

## Working with Claude Code

### How to Request
```
"Add user-card component to users entity"
→ Creates src/entities/user/ui/user-card.tsx

"Create add to cart feature"
→ Creates src/features/add-to-cart/ folder structure
```

### Automatically Checked Items
- Kebab-case file names
- Proper FSD layer placement
- Test file creation
- Type safety
- Circular dependency prevention

## Reference Documentation
- [FSD Official Documentation](https://feature-sliced.design/)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
