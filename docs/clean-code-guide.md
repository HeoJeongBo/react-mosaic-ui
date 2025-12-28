# Clean Code Guide

## Core Principles

### 1. Meaningful Names
Variable, function, and class names should reveal their reason for existence, what they do, and how they are used.

```typescript
// ❌ Bad: unclear meaning
const d = new Date();
const list = users.filter(u => u.age > 18);

// ✅ Good: clear intent
const currentDate = new Date();
const adultUsers = users.filter(user => user.age > 18);
```

### 2. Functions Should Do One Thing (Single Responsibility)
A function should do one thing, and do it well.

```typescript
// ❌ Bad: multiple responsibilities
const processUser = (user: User) => {
  // Validation
  if (!user.email) throw new Error('Email required');

  // Data transformation
  const formatted = formatUserData(user);

  // API call
  saveToDatabase(formatted);

  // Notification
  sendWelcomeEmail(user.email);
};

// ✅ Good: single responsibility
const validateUser = (user: User): void => {
  if (!user.email) throw new Error('Email required');
  if (!user.name) throw new Error('Name required');
};

const createUser = async (user: User): Promise<User> => {
  validateUser(user);
  const formattedUser = formatUserData(user);
  const savedUser = await saveToDatabase(formattedUser);
  await sendWelcomeEmail(savedUser.email);
  return savedUser;
};
```

### 3. Small Functions
Functions should be as small as possible. Ideally under 20 lines.

```typescript
// ❌ Bad: long function
const calculateOrderTotal = (order: Order) => {
  let subtotal = 0;
  for (let i = 0; i < order.items.length; i++) {
    subtotal += order.items[i].price * order.items[i].quantity;
  }

  let discount = 0;
  if (order.couponCode) {
    if (order.couponCode === 'SAVE10') {
      discount = subtotal * 0.1;
    } else if (order.couponCode === 'SAVE20') {
      discount = subtotal * 0.2;
    }
  }

  let shipping = 0;
  if (subtotal < 50) {
    shipping = 5;
  }

  return subtotal - discount + shipping;
};

// ✅ Good: split into smaller functions
const calculateSubtotal = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

const calculateDiscount = (subtotal: number, couponCode?: string): number => {
  if (!couponCode) return 0;

  const discountRates: Record<string, number> = {
    'SAVE10': 0.1,
    'SAVE20': 0.2,
  };

  return subtotal * (discountRates[couponCode] || 0);
};

const calculateShipping = (subtotal: number): number => {
  const FREE_SHIPPING_THRESHOLD = 50;
  const SHIPPING_COST = 5;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
};

const calculateOrderTotal = (order: Order): number => {
  const subtotal = calculateSubtotal(order.items);
  const discount = calculateDiscount(subtotal, order.couponCode);
  const shipping = calculateShipping(subtotal);
  return subtotal - discount + shipping;
};
```

### 4. DRY (Don't Repeat Yourself)
Eliminate duplicate code and extract into reusable functions.

```typescript
// ❌ Bad: duplicate code
const saveUser = async (user: User) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

const saveProduct = async (product: Product) => {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};

// ✅ Good: reusable function
const apiPost = async <T>(endpoint: string, data: T): Promise<T> => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error(`Error posting to ${endpoint}:`, error);
    throw error;
  }
};

const saveUser = (user: User) => apiPost('/api/users', user);
const saveProduct = (product: Product) => apiPost('/api/products', product);
```

### 5. Fewer Function Arguments
Ideally 0-2 arguments, maximum 3.

```typescript
// ❌ Bad: too many arguments
const createUser = (
  name: string,
  email: string,
  age: number,
  address: string,
  phone: string,
  role: string
) => {
  // ...
};

// ✅ Good: group into object
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  address: string;
  phone: string;
  role: string;
}

const createUser = (params: CreateUserParams) => {
  // ...
};
```

### 6. Early Return
Reduce nesting and improve readability.

```typescript
// ❌ Bad: nested conditionals
const getUserDiscount = (user: User): number => {
  if (user) {
    if (user.isPremium) {
      if (user.loyaltyPoints > 1000) {
        return 0.3;
      } else {
        return 0.2;
      }
    } else {
      return 0.1;
    }
  } else {
    return 0;
  }
};

// ✅ Good: early return
const getUserDiscount = (user: User | null): number => {
  if (!user) return 0;
  if (!user.isPremium) return 0.1;
  if (user.loyaltyPoints > 1000) return 0.3;
  return 0.2;
};
```

### 7. Immutability
Use immutable data whenever possible.

```typescript
// ❌ Bad: modifying original array
const addItem = (cart: CartItem[], newItem: CartItem) => {
  cart.push(newItem);
  return cart;
};

// ✅ Good: return new array
const addItem = (cart: CartItem[], newItem: CartItem): CartItem[] => {
  return [...cart, newItem];
};

// ❌ Bad: directly modifying object
const updateUser = (user: User, name: string) => {
  user.name = name;
  return user;
};

// ✅ Good: return new object
const updateUser = (user: User, name: string): User => {
  return { ...user, name };
};
```

### 8. Type Safety
Leverage TypeScript's type system to the fullest.

```typescript
// ❌ Bad: using any
const processData = (data: any) => {
  return data.map((item: any) => item.value);
};

// ✅ Good: explicit types
interface DataItem {
  id: string;
  value: number;
}

const processData = (data: DataItem[]): number[] => {
  return data.map(item => item.value);
};

// ❌ Bad: overusing type assertions
const user = getUser() as User;

// ✅ Good: using type guards
const isUser = (data: unknown): data is User => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
};

const user = getUser();
if (isUser(user)) {
  // user is User type
}
```

### 9. Pure Functions
Write functions without side effects.

```typescript
// ❌ Bad: has side effects
let total = 0;
const addToTotal = (value: number) => {
  total += value; // modifying external state
  console.log(total); // side effect
};

// ✅ Good: pure function
const add = (a: number, b: number): number => {
  return a + b;
};
```

### 10. Meaningful Error Handling

```typescript
// ❌ Bad: ignoring errors
const getUser = async (id: string) => {
  try {
    return await fetchUser(id);
  } catch (error) {
    console.log(error);
    return null;
  }
};

// ✅ Good: explicit error handling
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with id ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

const getUser = async (id: string): Promise<User> => {
  try {
    return await fetchUser(id);
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new UserNotFoundError(id);
    }
    throw error;
  }
};
```

## React Component Clean Code

### 1. Small and Focused Components

```typescript
// ❌ Bad: too many responsibilities
const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user data
    // Fetch order data
    // Fetch statistics data
  }, []);

  return (
    <div>
      {/* Header */}
      {/* User info */}
      {/* Order list */}
      {/* Statistics chart */}
    </div>
  );
};

// ✅ Good: separated components
const UserDashboard = () => {
  return (
    <div>
      <DashboardHeader />
      <UserInfo />
      <OrderList />
      <StatisticsChart />
    </div>
  );
};
```

### 2. Separate Logic with Custom Hooks

```typescript
// ❌ Bad: logic mixed in component
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        setProducts(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Error error={error} />;

  return <div>{/* ... */}</div>;
};

// ✅ Good: separated with custom hook
const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        setProducts(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
};

const ProductList = () => {
  const { products, loading, error } = useProducts();

  if (loading) return <Spinner />;
  if (error) return <Error error={error} />;

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

### 3. Structured Props

```typescript
// ❌ Bad: too many props
const Button = (props: {
  text: string;
  onClick: () => void;
  color: string;
  size: string;
  disabled: boolean;
  loading: boolean;
  icon?: ReactNode;
}) => {
  // ...
};

// ✅ Good: grouping and default values
interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  state?: {
    disabled?: boolean;
    loading?: boolean;
  };
  icon?: ReactNode;
}

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  state = {},
  icon,
}: ButtonProps) => {
  const { disabled = false, loading = false } = state;
  // ...
};
```

## Code Review Checklist

After writing code, verify the following:

- [ ] Do variable/function names clearly reveal intent?
- [ ] Does each function have a single responsibility?
- [ ] Are functions under 20 lines?
- [ ] Is there no duplicate code?
- [ ] Are there 3 or fewer function arguments?
- [ ] Is early return used?
- [ ] Is immutability maintained?
- [ ] Is the `any` type not used?
- [ ] Are side effects clearly separated?
- [ ] Is error handling appropriate?
- [ ] Are components small and focused?
- [ ] Is logic separated into custom hooks?

## Recommended Tools

- **ESLint**: Code style checking
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Husky**: Code quality management with Git hooks
