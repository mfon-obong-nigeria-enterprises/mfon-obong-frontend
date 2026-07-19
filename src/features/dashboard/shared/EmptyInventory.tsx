import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Download, Plus } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

const EmptyInventory = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="space-y-7 mt-2 mx-4">
      <h5 className="text-black font-medium font-Inter text-xl">
        Product and Category
      </h5>

      <div className="flex justify-center items-center bg-white border border-border rounded-[10px] min-h-[55vh] h-full py-20">
        <div className=" flex flex-col justify-center items-center gap-10">
          {/* icon */}
          <div className="w-[100px] md:w-[150px] h-[100px] md:h-[150px] bg-[#FFEEED] rounded-full flex justify-center items-center">
            <img
              src="/icons/empty-inventory.svg"
              alt=""
              className="w-[49px] md:w-[60px]"
            />
          </div>

          {/* description */}
          <div className="flex flex-col gap-3 justify-center items-center">
            <h6 className="font-Inter text-[#333333] text-lg md:text-2xl font-medium">
              No Product in your inventory yet!
            </h6>
            {user?.role !== "STAFF" && (
              <p className="font-medium text-[#7D7D7D] text-xs md:text-sm max-w-[295px] md:max-w-[400px] text-center">
                Start building your inventory by adding products from the warehouse catalog, or import them from a spreadsheet.
              </p>
            )}
          </div>

          {/* buttons */}
          {user?.role !== "STAFF" && (
            <div className="flex flex-col md:flex-row gap-5">
              <Button onClick={() => navigate("/add-prod")}>
                <Plus /> Add Product
              </Button>
              <Button
                variant="tertiary"
                onClick={() => navigate("/import-stock")}
                className="w-50"
              >
                <Download />
                Import Stock
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptyInventory;
