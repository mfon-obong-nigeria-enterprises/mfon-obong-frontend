import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { createNewUser } from "@/services/userService";
import { createUserSchema } from "@/schemas/userSchema";
import { toast } from "react-toastify";
// type
import type {
  CreateUserPayload,
  CreateUserFormValues,
} from "@/schemas/userSchema";

//
import { useBranchStore } from "@/stores/useBranchStore";

// ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const CreateUserModal = ({ closeModal }: { closeModal: () => void }) => {
  const branches = useBranchStore((s) => s.branches);
  const query = new QueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateUserPayload) => createNewUser(data),
    onSuccess: (data) => {
      toast.success(`Account created successfully for ${data.name}`);
      query.invalidateQueries({ queryKey: ["users"] });
      closeModal();
      reset();
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error?.message || "Failed to create user"
        : "Failed to create user";
      toast.error(message);
    },
  });

  const onSubmit = (data: CreateUserFormValues) => {
    const branch = branches.find((b) => b._id === data.branch);

    if (!branch) {
      toast.error("Selected branch not found");
      return;
    }
    const payload: CreateUserPayload = {
      ...data,
      name: `${data.firstName} ${data.lastName}`,
      branchId: branch._id,
      branch: branch.name,
    };

    // payload has no firstName/lastName
    mutation.mutate(payload);
  };

  return (
    <section className="font-Inter">
      <h4 className="text-xl text-[#1E1E1E] font-medium border-b py-6 px-9">
        Create New User
      </h4>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-6 py-6 px-9">
          {/* first name */}
          <div>
            <label
              htmlFor="userfirstname"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              First name
            </label>
            <Input
              type="text"
              id="userfirstname"
              {...register("firstName")}
              disabled={mutation.isPending}
              aria-invalid={!!errors.firstName}
              placeholder="Enter first name"
              className={`text-[#7D7D7D] md:text-sm ${
                errors.firstName
                  ? "border-[var(--cl-error)]"
                  : "border-[var(--cl-gray-a1)]"
              } ${mutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.firstName?.message ?? ""}
            </p>
          </div>

          {/* last name */}
          <div>
            <label
              htmlFor="userlastname"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Last name
            </label>
            <Input
              type="text"
              id="userlastname"
              {...register("lastName")}
              disabled={mutation.isPending}
              aria-invalid={!!errors.lastName}
              placeholder="Enter last name"
              className={`text-[#7D7D7D] md:text-sm ${
                errors.lastName
                  ? "border-[var(--cl-error)]"
                  : "border-[var(--cl-gray-a1)]"
              } ${mutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.lastName?.message ?? ""}
            </p>
          </div>

          {/*  user phone number */}
          <div>
            <label
              htmlFor="userphonenumber"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Phone number
            </label>
            <Input
              type="tel"
              id="userphonenumber"
              {...register("phone")}
              disabled={mutation.isPending}
              aria-invalid={!!errors.phone}
              placeholder="Enter user phone number"
              onKeyDown={(e) => {
                if (!/[\d+\b]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className={`text-[#7D7D7D] md:text-sm ${
                errors.phone
                  ? "border-[var(--cl-error)]"
                  : "border-[var(--cl-gray-a1)]"
              } ${mutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.phone?.message ?? ""}
            </p>
          </div>

          {/* user address */}
          <div>
            <label
              htmlFor="useraddress"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Address
            </label>
            <Input
              type="text"
              id="useraddress"
              {...register("address")}
              disabled={mutation.isPending}
              aria-invalid={!!errors.address}
              placeholder="Enter user address"
              className={`text-[#7D7D7D] md:text-sm ${
                errors.address
                  ? "border-[var(--cl-error)]"
                  : "border-[var(--cl-gray-a1)]"
              } ${mutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.address?.message ?? ""}
            </p>
          </div>

          {/* user password */}
          <div>
            <label
              htmlFor="userpassword"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Password
            </label>
            <Input
              type="text"
              id="userpassword"
              {...register("password")}
              disabled={mutation.isPending}
              aria-invalid={!!errors.password}
              placeholder="Enter user password"
              className={`text-[#7D7D7D] md:text-sm ${
                errors.password
                  ? "border-[var(--cl-error)]"
                  : "border-[var(--cl-gray-a1)]"
              } ${mutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.password?.message ?? ""}
            </p>
          </div>

          {/* user email */}
          <div>
            <label
              htmlFor="useremail"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Email Address
            </label>
            <Input
              type="email"
              id="useremail"
              {...register("email")}
              disabled={mutation.isPending}
              aria-invalid={!!errors.email}
              placeholder="Enter user email address"
              className={`text-[#7D7D7D] md:text-sm ${
                errors.email
                  ? "border-[var(--cl-error)]"
                  : "border-[var(--cl-gray-a1)]"
              } ${mutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.email?.message ?? ""}
            </p>
          </div>

          {/* role */}
          <div>
            <label
              htmlFor="userrole"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Role
            </label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-[var(--cl-error)] text-sm pt-1">
              {errors.role?.message ?? ""}
            </p>
          </div>

          {/* branch */}
          <div>
            <label
              htmlFor="userrole"
              className="text-[13px] md:text-sm text-[#444444]"
            >
              Branch
            </label>
            <Controller
              name="branch"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="bg-[#F5F5F5] h-24 flex justify-end items-center gap-5 px-5">
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating user..." : "Create User"}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default CreateUserModal;
