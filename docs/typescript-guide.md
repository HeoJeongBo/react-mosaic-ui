# TypeScript Guide

## Type Definition Principles

### 1. Minimize `any` Usage

```typescript
// ❌ Bad
const processData = (data: any) => {
  return data.value;
};

// ✅ Good
interface DataItem {
  value: string;
  id: number;
}

const processData = (data: DataItem): string => {
  return data.value;
};

// ✅ Better: using generics
const processData = <T extends { value: string }>(data: T): string => {
  return data.value;
};
```

### 2. Interface vs Type

**When to use Interface**: Defining object shapes, when extensibility is needed

```typescript
// ✅ Interface: object shape, extensible
interface User {
  id: string;
  name: string;
  email: string;
}

interface Admin extends User {
  role: 'admin';
  permissions: string[];
}
```

**When to use Type**: Union, Intersection, Utility Types

```typescript
// ✅ Type: Union, Primitive alias
type Status = 'pending' | 'success' | 'error';
type ID = string | number;

// ✅ Type: Intersection
type UserWithTimestamp = User & {
  createdAt: Date;
  updatedAt: Date;
};
```

### 3. Explicit Type Definitions

```typescript
// ❌ Bad: relying only on type inference
const users = [];
users.push({ name: 'John' }); // No error

// ✅ Good: explicit type
const users: User[] = [];
users.push({ name: 'John' }); // Error: email field missing
```

### 4. Using Type Guards

```typescript
// Type guard function
const isUser = (data: unknown): data is User => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'email' in data
  );
};

// Usage
const processUser = (data: unknown) => {
  if (isUser(data)) {
    // data is User type
    console.log(data.name);
  }
};

// Discriminated Union
type Response =
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };

const handleResponse = (response: Response) => {
  if (response.status === 'success') {
    console.log(response.data); // can access data
  } else {
    console.log(response.error); // can access error
  }
};
```

### 5. Using Utility Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Partial: make all fields optional
type UpdateUserPayload = Partial<User>;

// Omit: exclude specific fields
type PublicUser = Omit<User, 'password'>;

// Pick: select specific fields only
type UserCredentials = Pick<User, 'email' | 'password'>;

// Required: make all fields required
type RequiredUser = Required<Partial<User>>;

// Readonly: make read-only
type ImmutableUser = Readonly<User>;

// Record: key-value pairs
type UserMap = Record<string, User>;
```

## Function Type Definitions

### 1. Function Signatures

```typescript
// ❌ Bad: no types
const add = (a, b) => a + b;

// ✅ Good: explicit types
const add = (a: number, b: number): number => a + b;

// ✅ Better: separate function type definition
type AddFunction = (a: number, b: number) => number;
const add: AddFunction = (a, b) => a + b;
```

### 2. Optional Parameters and Default Values

```typescript
// Optional parameter
const greet = (name: string, greeting?: string): string => {
  return `${greeting || 'Hello'}, ${name}!`;
};

// Default value (inferred)
const greet = (name: string, greeting = 'Hello'): string => {
  return `${greeting}, ${name}!`;
};

// Object parameter
interface GreetOptions {
  name: string;
  greeting?: string;
  enthusiastic?: boolean;
}

const greet = ({ name, greeting = 'Hello', enthusiastic = false }: GreetOptions): string => {
  const message = `${greeting}, ${name}`;
  return enthusiastic ? `${message}!` : message;
};
```

### 3. Generic Functions

```typescript
// Basic generic
const identity = <T>(value: T): T => value;

// Generic with constraints
const getProperty = <T, K extends keyof T>(obj: T, key: K): T[K] => {
  return obj[key];
};

// Complex generic
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const fetchData = async <T>(url: string): Promise<ApiResponse<T>> => {
  const response = await fetch(url);
  return response.json();
};

// Usage
const userData = await fetchData<User>('/api/users/1');
```

## React Type Definitions

### 1. Component Props

```typescript
// Basic Props
interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

const Button = ({ children, onClick, variant = 'primary', disabled = false }: ButtonProps) => {
  // ...
};

// Extending HTML attributes
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = ({ label, error, ...inputProps }: InputProps) => {
  return (
    <div>
      <label>{label}</label>
      <input {...inputProps} />
      {error && <span>{error}</span>}
    </div>
  );
};

// Generic Props
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

const List = <T,>({ items, renderItem, keyExtractor }: ListProps<T>) => {
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
};
```

### 2. Hook Types

```typescript
// useState
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// useRef
const inputRef = useRef<HTMLInputElement>(null);
const timerRef = useRef<NodeJS.Timeout | null>(null);

// useReducer
type State = {
  count: number;
  error: string | null;
};

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'error'; error: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'decrement':
      return { ...state, count: state.count - 1 };
    case 'error':
      return { ...state, error: action.error };
    default:
      return state;
  }
};

const [state, dispatch] = useReducer(reducer, { count: 0, error: null });

// Custom Hook
interface UseUserResult {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const useUser = (userId: string): UseUserResult => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await api.getUser(userId);
      setUser(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  return { user, loading, error, refetch: fetchUser };
};
```

### 3. Event Handlers

```typescript
// Form event
const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // ...
};

// Input event
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
};

// Click event
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  console.log(event.currentTarget);
};

// Keyboard event
const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    // ...
  }
};
```

## Advanced Type Patterns

### 1. Branded Types

```typescript
// Enhanced type safety
type UserId = string & { readonly __brand: 'UserId' };
type ProductId = string & { readonly __brand: 'ProductId' };

const createUserId = (id: string): UserId => id as UserId;
const createProductId = (id: string): ProductId => id as ProductId;

const getUser = (id: UserId) => { /* ... */ };

const userId = createUserId('123');
const productId = createProductId('456');

getUser(userId); // ✅
getUser(productId); // ❌ Error
```

### 2. Template Literal Types

```typescript
type Color = 'red' | 'blue' | 'green';
type Size = 'small' | 'medium' | 'large';

// Combination
type ColoredSize = `${Color}-${Size}`;
// 'red-small' | 'red-medium' | 'red-large' | 'blue-small' | ...

// API endpoints
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Endpoint = `/api/${string}`;
type ApiRoute = `${HttpMethod} ${Endpoint}`;

const route: ApiRoute = 'GET /api/users'; // ✅
```

### 3. Conditional Types

```typescript
// Conditional type
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// Complex conditional type
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type A = UnwrapPromise<Promise<string>>; // string
type B = UnwrapPromise<number>; // number

// Extract function return type
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

const getUser = (): User => ({ id: '1', name: 'John', email: 'john@example.com' });
type UserType = ReturnTypeOf<typeof getUser>; // User
```

## Type File Structure

### File Organization

```typescript
// user.types.ts

// Basic types
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Extended types
export interface UserWithProfile extends User {
  profile: UserProfile;
}

// API-related types
export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserPayload extends Partial<Omit<User, 'id' | 'createdAt'>> {}

export interface UserApiResponse {
  user: User;
  token: string;
}

// State-related types
export interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: Error | null;
}
```

## Recommended tsconfig.json Settings

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",

    // Strict type checking
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    // Module resolution
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["src/shared/*"],
      "@/entities/*": ["src/entities/*"],
      "@/features/*": ["src/features/*"],
      "@/widgets/*": ["src/widgets/*"],
      "@/pages/*": ["src/pages/*"],
      "@/app/*": ["src/app/*"]
    },

    // Other
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Checklist

- [ ] Is the `any` type not used?
- [ ] Are return types specified for all functions?
- [ ] Are interfaces and types used appropriately?
- [ ] Are type guards used to ensure runtime safety?
- [ ] Are Utility Types utilized?
- [ ] Are generics used appropriately?
- [ ] Are React component Props types defined?
- [ ] Are event handler types specified?
- [ ] Are type files properly separated?
- [ ] Is tsconfig.json set to strict mode?
