// BusinessLocationModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranchStore } from "@/stores/useBranchStore";
import { X } from "lucide-react";

type Props = {
  closeModal: () => void;
};

const BusinessLocationModal = ({ closeModal }: Props) => {
  const { addBranch } = useBranchStore();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name,
        address,
        phone,
        email: email.trim() === "" ? undefined : email,
      };

      await addBranch(payload);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeModal();
      }, 4000);
    } catch (error: any) {
      console.error("Error creating branch:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setShowSuccess(false);
    closeModal();
  };

  return (
    <>
      {showSuccess && (
        <div className="fixed top-4 left-4 z-[100] animate-in slide-in-from-left-8 duration-300">
          <div className="bg-green-500 text-white px-4 py-3 rounded-md shadow-lg flex items-center justify-between min-w-[300px]">
            <span>✓ New location was successfully created</span>
            <button
              onClick={handleCloseNotification}
              className="ml-4 text-white hover:text-green-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="p-6 h-fit">
        <h2 className="text-xl font-bold mb-4 border-b-2">Create Business Location</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="pb-2">Location Type</Label>
            <Input
              placeholder="e.g main Office/branch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-[#D9D9D9]"
            />
          </div>

          <div>
            <Label className="pb-2">Address</Label>
            <Input
              placeholder="e.g 233 Abak Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="bg-[#D9D9D9]"
            />
          </div>

          <div>
            <Label className="pb-2">Email</Label>
            <Input
              placeholder="Enter company email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#D9D9D9]"
            />
          </div>

          <div>
            <Label className="pb-2">Phone</Label>
            <Input
              placeholder="Enter company phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              required
              className="bg-[#D9D9D9]"
              inputMode="numeric"
              pattern="[0-9]+"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Location"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BusinessLocationModal;
