# Testing Guide

## File Naming

All test files use `.tt.ts` or `.tt.tsx` extension.

```
my-component.tsx       # Component
my-component.tt.tsx    # Component test

format-date.ts         # Util function
format-date.tt.ts      # Util test

user-api.ts            # API client
user-api.tt.ts         # API test
```

## Testing Principles

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
// format-date.tt.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './format-date';

describe('formatDate', () => {
  it('should format date to YYYY-MM-DD', () => {
    // Arrange: set up test
    const date = new Date('2024-01-15');

    // Act: execute
    const result = formatDate(date, 'YYYY-MM-DD');

    // Assert: verify
    expect(result).toBe('2024-01-15');
  });
});
```

### 2. Meaningful Test Names

```typescript
// ❌ Bad: unclear test names
it('test1', () => {});
it('works', () => {});

// ✅ Good: clear test names
it('should return empty array when no items provided', () => {});
it('should throw error when email is invalid', () => {});
it('should disable button when loading is true', () => {});
```

### 3. Test One Concept at a Time

```typescript
// ❌ Bad: testing multiple concepts
it('should handle user operations', () => {
  expect(createUser()).toBeDefined();
  expect(updateUser()).toBeDefined();
  expect(deleteUser()).toBeDefined();
});

// ✅ Good: separate each concept
it('should create user with valid data', () => {
  const user = createUser({ name: 'John', email: 'john@example.com' });
  expect(user).toBeDefined();
});

it('should update user name', () => {
  const updated = updateUser(user, { name: 'Jane' });
  expect(updated.name).toBe('Jane');
});

it('should delete user by id', () => {
  const result = deleteUser(user.id);
  expect(result).toBe(true);
});
```

## Unit Tests

### Testing Pure Functions

```typescript
// calculate-price.ts
export const calculateTotalPrice = (
  items: CartItem[],
  discountRate: number = 0
): number => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal * (1 - discountRate);
};

// calculate-price.tt.ts
import { describe, it, expect } from 'vitest';
import { calculateTotalPrice } from './calculate-price';

describe('calculateTotalPrice', () => {
  it('should calculate total price without discount', () => {
    const items = [
      { id: '1', price: 100, quantity: 2 },
      { id: '2', price: 50, quantity: 1 },
    ];

    const total = calculateTotalPrice(items);

    expect(total).toBe(250);
  });

  it('should apply discount rate', () => {
    const items = [{ id: '1', price: 100, quantity: 1 }];

    const total = calculateTotalPrice(items, 0.1);

    expect(total).toBe(90);
  });

  it('should return 0 for empty items', () => {
    const total = calculateTotalPrice([]);

    expect(total).toBe(0);
  });
});
```

### Testing Type Guards

```typescript
// type-guards.ts
export const isUser = (data: unknown): data is User => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'email' in data
  );
};

// type-guards.tt.ts
import { describe, it, expect } from 'vitest';
import { isUser } from './type-guards';

describe('isUser', () => {
  it('should return true for valid user object', () => {
    const validUser = {
      id: '1',
      name: 'John',
      email: 'john@example.com',
    };

    expect(isUser(validUser)).toBe(true);
  });

  it('should return false for invalid object', () => {
    const invalidUser = {
      id: '1',
      name: 'John',
      // missing email
    };

    expect(isUser(invalidUser)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isUser(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isUser(undefined)).toBe(false);
  });
});
```

## React Component Tests

### Basic Component Testing

```typescript
// button.tsx
interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
}: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button button--${variant}`}
    >
      {children}
    </button>
  );
};

// button.tt.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button onClick={() => {}}>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply variant class', () => {
    const { container } = render(
      <Button onClick={() => {}} variant="secondary">Click me</Button>
    );

    expect(container.querySelector('.button--secondary')).toBeInTheDocument();
  });
});
```

### Custom Hook Testing

```typescript
// use-counter.ts
export const useCounter = (initialValue: number = 0) => {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
};

// use-counter.tt.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './use-counter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('should initialize with custom value', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('should reset to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

## API Tests

### API Testing with Mocks

```typescript
// user-api.ts
export const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
};

// user-api.tt.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUser } from './user-api';

// fetch mock
global.fetch = vi.fn();

describe('fetchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user successfully', async () => {
    const mockUser = {
      id: '1',
      name: 'John',
      email: 'john@example.com',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const user = await fetchUser('1');

    expect(user).toEqual(mockUser);
    expect(global.fetch).toHaveBeenCalledWith('/api/users/1');
  });

  it('should throw error when fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    await expect(fetchUser('1')).rejects.toThrow('Failed to fetch user');
  });
});
```

## Integration Tests

```typescript
// user-profile.tsx
export const UserProfile = ({ userId }: { userId: string }) => {
  const { user, loading, error } = useUser(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};

// user-profile.tt.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './user-profile';
import * as userApi from '@/entities/user/api/user-api';

vi.mock('@/entities/user/api/user-api');

describe('UserProfile', () => {
  it('should show loading state', () => {
    vi.spyOn(userApi, 'fetchUser').mockImplementation(
      () => new Promise(() => {}) // pending forever
    );

    render(<UserProfile userId="1" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show user data when loaded', async () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    vi.spyOn(userApi, 'fetchUser').mockResolvedValue(mockUser);

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should show error message when fetch fails', async () => {
    vi.spyOn(userApi, 'fetchUser').mockRejectedValue(
      new Error('Network error')
    );

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });
});
```

## Test Coverage

### Goals
- **Unit Tests**: 80% or higher
- **Business Logic**: 100%
- **API Layer**: 90% or higher

### Measurement
```bash
# Vitest coverage
npm run test:coverage

# View results
# Open coverage/index.html
```

## Test Structure

```
src/
├── features/
│   └── auth/
│       ├── ui/
│       │   ├── login-form.tsx
│       │   └── login-form.tt.tsx
│       ├── model/
│       │   ├── auth-store.ts
│       │   └── auth-store.tt.ts
│       └── api/
│           ├── auth-api.ts
│           └── auth-api.tt.ts
```

## Checklist

- [ ] Do all test files use `.tt.ts` or `.tt.tsx` extension?
- [ ] Does it follow the AAA pattern?
- [ ] Are test names clear?
- [ ] Does each test verify only one concept?
- [ ] Are edge cases tested?
- [ ] Are mocks used appropriately?
- [ ] Does test coverage meet the target?
- [ ] Is business logic 100% covered?
