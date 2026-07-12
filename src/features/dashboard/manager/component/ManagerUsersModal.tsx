import { useEffect, useState, type ChangeEvent } from "react";
import type { DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Camera } from "lucide-react";
import { toast } from "react-toastify";
import { useUser, useUserMutations } from "@/hooks/useUserMutation";
import { useAuthStore } from "@/stores/useAuthStore";

type ManagerData = {
  _id: string;
  email: string;
  userRole: string;
  name: string;
  branch: string;
  profilePicture: string;
  theme?: boolean;
};

interface ManagerUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: ManagerData;
  onProfileUpdate: (updatedData: ManagerData) => void;
}

export function ManagerUsersModal({
  open,
  onOpenChange,
  userData,
  onProfileUpdate,
}: ManagerUsersModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [profileData, setProfileData] = useState({
    userRole: "",
    name: "",
    branch: "",
    image: null as File | null,
    profilePicture: "",
  });

  // Get current logged-in user from auth store
  const { user: currentUser } = useAuthStore();

  // Only call useUser if userData._id matches the current logged-in user
  // This prevents unnecessary API calls that would result in 403 errors
  const shouldFetchUser = !!(userData._id && userData._id === currentUser?.id);
  const { data: userProfile, isLoading: isLoadingProfile } = useUser(
    userData._id || "",
    shouldFetchUser
  );
  const { updateProfile } = useUserMutations(); // Only use the combined mutation

  // Load profile data when modal opens or userData changes
  useEffect(() => {
    if (userData?._id && open) {
      if (userProfile) {
        setProfileData({
          userRole: userProfile.role || userData.userRole,
          name: userProfile.name || userData.name,

          branch:
            typeof userProfile.branchId === "object"
              ? userData.branch
              : userProfile.branch,
          image: null,
          profilePicture:
            userProfile.profilePicture || userData.profilePicture || "",
        });
      } else {
        // Fallback to userData while loading
        setProfileData({
          userRole: userData.userRole,
          name: userData.name,
          branch: userData.branch,
          image: null,
          profilePicture: userData.profilePicture || "",
        });
      }
    }
  }, [userData, userProfile, open]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event?.target.files;
    const selectedFile = files && files.length > 0 ? files[0] : null;

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Store file for form submission
    setProfileData({
      ...profileData,
      image: selectedFile,
    });
  };

  // Form submission using ONLY the combined mutation
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userData._id) {
      toast.error("User ID is required");
      return;
    }

    try {
      // Use ONLY the combined updateProfile mutation
      const updateData: {
        userId: string;
        userData?: { fullName?: string; location?: string };
        imageFile?: File;
      } = {
        userId: userData._id,
      };

      // Only add userData if there are actual changes
      if (
        profileData.name !== userData.name ||
        profileData.branch !== userData.branch
      ) {
        updateData.userData = {
          fullName: profileData.name,
          location: profileData.branch,
        };
      }

      // Only add imageFile if there's a new image
      if (profileData.image) {
        updateData.imageFile = profileData.image;
      }

      // Call the combined mutation
      const result = await updateProfile.mutateAsync(updateData);

      // Update local callback with the server response
      const updatedData: ManagerData = {
        ...userData,
        name: result.user?.fullName || result.user?.name || profileData.name,
        branch:
          result.user?.location || result.user?.branch || profileData.branch,
        profilePicture: result.profilePicture || profileData.profilePicture,
      };

      onProfileUpdate(updatedData);
      onOpenChange(false);

      // Clear form state
      setProfileData((prev) => ({ ...prev, image: null }));
    } catch (error) {
      console.error("Update error:", error);
      // Error toast is handled by the mutation hook
    }
  };

  const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    const file = files?.[0];

    if (!file) {
      toast.error("No file was dropped");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }

    // Store file for form submission
    setProfileData({
      ...profileData,
      image: file,
    });
  };

  // Only use stored picture if it's a valid Cloudinary URL (prevents stale MongoDB ghost images)
  const storedPicture = userProfile?.profilePicture || profileData.profilePicture || userData.profilePicture;
  const validStoredPicture = storedPicture?.includes("res.cloudinary.com") ? storedPicture : null;
  const displayImage = profileData.image
    ? URL.createObjectURL(profileData.image)
    : validStoredPicture;

  const isLoading = updateProfile.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] font-inter rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 space-y-6">
          <form className="space-y-4" onSubmit={handleFormSubmit}>
            <h2 className="text-lg font-semibold">Edit Profile</h2>

            <div className="flex items-center space-x-4 p-4 bg-[#D9D9D9] rounded-lg shadow-sm">
              <div
                className={`relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                } transition-all duration-200 cursor-pointer`}
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={`${userData.userRole} Avatar`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                    <span className="text-gray-500 text-xs block">
                      Choose photo
                    </span>
                  </div>
                )}

                <label
                  htmlFor="profile-upload"
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white cursor-pointer ${
                    isLoading ? "opacity-100" : "opacity-0 hover:opacity-100"
                  } transition-opacity duration-300 rounded-full`}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                  <span className="sr-only">Choose photo from file</span>
                </label>

                <input
                  id="profile-upload"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-800">
                  {profileData.name || userData.name || ""}
                </h3>
                <p className="text-sm text-gray-600">
                  {profileData.userRole || userData.userRole || "User Role"}
                </p>
                {isLoadingProfile && (
                  <div className="flex items-center mt-1">
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span className="text-xs text-gray-500">
                      Loading profile...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isDragging && (
              <div className="text-center p-4 border-2 border-dashed border-blue-500 bg-blue-50 rounded-lg">
                <p className="text-blue-600 font-medium">
                  Drop your image here
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-gray-700 text-sm font-medium">
                Full name
              </label>
              <input
                name="name"
                onChange={handleProfileChange}
                value={profileData.name}
                placeholder="Enter full name"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200 ease-in-out"
                disabled={isLoading || isLoadingProfile}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 text-sm font-medium">
                Location
              </label>
              <input
                name="location"
                onChange={handleProfileChange}
                value={profileData.branch}
                placeholder="Enter location"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200 ease-in-out"
                disabled={isLoading || isLoadingProfile}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 text-sm font-medium">
                Role
              </label>
              <input
                value={profileData.userRole}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-100 cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs">
                This field can't be edited
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || isLoadingProfile}
              className="w-full bg-[#2ECC71] hover:bg-[#28B463] text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out shadow-md disabled:opacity-50"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
