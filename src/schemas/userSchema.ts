import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required").regex(/^\+?\d+$/, "Phone number must contain numbers only"),
  email: z.string().email("Email is required"),
  address: z.string().min(1, "Address is required"),
  role: z.enum(["STAFF", "ADMIN", "MAINTAINER", "SUPER_ADMIN"], {
    errorMap: () => ({
      message: "Role must be STAFF, ADMIN, MAINTAINER, or SUPER_ADMIN",
    }),
  }),
  branch: z.string(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
      "Password must include at least one uppercase, one lowercase, number, and one special character"
    ),
});
//   .transform((data) => ({
//     ...data,
//     name: `${data.firstName} ${data.lastName}`,
//   }));

// export type CreateUserPayload = z.infer<typeof createUserSchema>;

// Input type = raw form values
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

// Payload type = what backend expects
export type CreateUserPayload = Omit<
  CreateUserFormValues,
  "firstName" | "lastName"
> & {
  name: string;
  branchId: string;
};

// import { z } from "zod";

// export const createUserSchema = z.object({
//   firstName: z.string().min(1, "First name is required"),
//   lastName: z.string().min(1, "Last name is required"),
//   phone: z.string().min(1, "Phone number is required"),
//   email: z.string().email("Email is required"),
//   address: z.string().min(1, "Address is required"),
//   role: z.string(),
//   branch: z.string(),
//   password: z
//     .string()
//     .min(6, "Password must be at least 6 characters")
//     .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
//     .regex(/[a-z]/, "Password must contain at least one lowercase letter")
//     .regex(/[0-9]/, "Password must contain at least one number")
//     .regex(
//       /[^A-Za-z0-9]/,
//       "Password must contain at least one special character"
//     ),
// });
