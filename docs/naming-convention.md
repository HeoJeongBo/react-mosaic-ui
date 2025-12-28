# Naming Convention Guide

## File Naming

### Basic Rules
- Use **kebab-case**
- Use only lowercase letters and hyphens (`-`)
- Indicate file type with suffix before extension

### Naming by File Type

#### Component Files
```
user-profile.tsx          # React component
user-card.tsx             # React component
button.tsx                # UI component
```

#### Test Files
```
user-profile.tt.ts        # Test file
user-card.tt.tsx          # Component test
api-client.tt.ts          # Util test
```

#### Type Definition Files
```
user-profile.types.ts     # Type definitions
api-response.types.ts     # API types
common.types.ts           # Common types
```

#### Style Files
```
user-profile.styles.ts    # styled-components
user-card.module.css      # CSS Modules
button.styles.ts          # Style definitions
```

#### Hook Files
```
use-user-data.ts          # Custom Hook
use-auth.ts               # Auth Hook
use-fetch.ts              # Fetch Hook
```

#### Utility Files
```
format-date.ts            # Date formatting
calculate-price.ts        # Price calculation
validate-email.ts         # Email validation
```

#### Constant Files
```
api-endpoints.const.ts    # API endpoints
app-config.const.ts       # App configuration
routes.const.ts           # Route definitions
```

#### Model/Entity Files
```
user.model.ts             # User model
product.model.ts          # Product model
order.model.ts            # Order model
```

## Variable/Function Naming

### Variables
```typescript
// ✅ Good: camelCase, clear meaning
const userName = 'John';
const isAuthenticated = true;
const totalPrice = 100;
const userList = [];

// ❌ Bad: unclear, abbreviated
const un = 'John';
const auth = true;
const tp = 100;
const arr = [];
```

### Functions
```typescript
// ✅ Good: starts with verb, clear intent
const getUserById = (id: string): User => {};
const calculateTotalPrice = (items: Item[]): number => {};
const validateEmail = (email: string): boolean => {};
const formatDate = (date: Date): string => {};

// ❌ Bad: unclear intent
const get = (id: string) => {};
const calc = (items: any) => {};
const check = (email: string) => {};
const format = (date: Date) => {};
```

### Boolean Variables
```typescript
// ✅ Good: is/has/should prefix
const isLoading = true;
const hasPermission = false;
const shouldRender = true;
const canEdit = false;

// ❌ Bad: unclear
const loading = true;
const permission = false;
const render = true;
const edit = false;
```

### Components
```typescript
// ✅ Good: PascalCase
export const UserProfile = () => {};
export const ProductCard = () => {};
export const NavigationBar = () => {};

// ❌ Bad: camelCase
export const userProfile = () => {};
export const productCard = () => {};
```

### Types/Interfaces
```typescript
// ✅ Good: PascalCase
interface UserProfile {
  id: string;
  name: string;
}

type ProductId = string;

// ❌ Bad: camelCase or using prefix
interface iUserProfile {}
type productId = string;
```

### Constants
```typescript
// ✅ Good: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;

// ❌ Bad: camelCase
const apiBaseUrl = 'https://api.example.com';
const maxRetryCount = 3;
```

### Event Handlers
```typescript
// ✅ Good: handle prefix
const handleClick = () => {};
const handleSubmit = () => {};
const handleInputChange = () => {};

// ❌ Bad: on prefix (use only for props)
const onClick = () => {};
const onSubmit = () => {};
```

### Props
```typescript
// ✅ Good: on prefix (for event handler props)
interface ButtonProps {
  onClick: () => void;
  onSubmit?: () => void;
  isDisabled?: boolean;
  children: ReactNode;
}

// ❌ Bad: handle prefix (use only internally)
interface ButtonProps {
  handleClick: () => void;
}
```

## Folder Naming

### FSD Layers
```
src/
├── app/              # lowercase
├── pages/
├── widgets/
├── features/
├── entities/
└── shared/
```

### Slice (Feature) Folders
```
features/
├── auth/             # kebab-case
├── add-to-cart/
├── user-profile/
└── product-search/
```

### Segment Folders
```
auth/
├── ui/               # lowercase
├── model/
├── api/
└── lib/
```

## Naming Anti-Patterns

### ❌ Things to Avoid

```typescript
// 1. Excessive abbreviations
const usr = {}; // ❌ write as user
const btn = {}; // ❌ write as button
const msg = {}; // ❌ write as message

// 2. Unclear names
const data = {}; // ❌ be specific: userData, productData
const temp = ''; // ❌ give temporary variables meaningful names
const result = {}; // ❌ specify what result

// 3. Magic numbers/strings
if (status === 1) {} // ❌ define as constant
const url = '/api/users'; // ❌ manage with API_ENDPOINTS

// 4. Hungarian notation
const strName = ''; // ❌ unnecessary in TypeScript
const arrItems = []; // ❌ use type system
```

## Checklist

After writing code, verify the following:

- [ ] Are file names in kebab-case?
- [ ] Do test files use `.tt.ts` suffix?
- [ ] Do variable/function names clearly reveal intent?
- [ ] Do Boolean variables use `is/has/should` prefix?
- [ ] Are constants in `UPPER_SNAKE_CASE`?
- [ ] Are components and types in `PascalCase`?
- [ ] Are abbreviations not overused?
- [ ] Are magic numbers/strings defined as constants?
