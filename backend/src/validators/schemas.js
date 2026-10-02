const { z } = require('zod');

const email = z
  .string({ required_error: 'Email is required', invalid_type_error: 'Email must be text' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

// bcrypt only uses the first 72 bytes, so we cap the length at 72.
const password = z
  .string({ required_error: 'Password is required', invalid_type_error: 'Password must be text' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

const registerSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

const verifyOtpSchema = z.object({
  email,
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

const resendOtpSchema = z.object({ email });

// Accepts 9876543210, +919876543210, +91 98765 43210, 09876543210. Stores 10 digits.
const mobile = z
  .string({ required_error: 'Mobile number is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .transform((v) => v.replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

const profileSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  mobile,
  address: z
    .string({ required_error: 'Address is required' })
    .trim()
    .min(10, 'Please enter your full address (at least 10 characters)')
    .max(300, 'Address must be at most 300 characters'),
  // Optional on purpose: many households are not businesses.
  businessName: z
    .string()
    .trim()
    .max(100, 'Business name must be at most 100 characters')
    .optional()
    .nullable()
    .transform((v) => v || null),
});

const taskSelectionSchema = z.object({
  taskIds: z
    .array(z.number({ invalid_type_error: 'Task ids must be numbers' }).int().positive(), {
      required_error: 'taskIds is required',
      invalid_type_error: 'taskIds must be a list',
    })
    .min(1, 'Select at least one task')
    .max(100, 'Too many tasks selected'),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  profileSchema,
  taskSelectionSchema,
};
