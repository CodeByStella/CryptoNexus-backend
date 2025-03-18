import express from "express";
import DepositAddressController from "@/controllers/depositController"; // Ensure this points to the updated controller
import { admin, protect } from "@/middlewares/authMiddleware";
import { createDeposit, getUserDeposits } from "@/controllers/userDeposit";
import multer from "multer";

const router = express.Router();

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb: any) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// Existing routes (unchanged)
router.get("/deposit-addresses", DepositAddressController.getAll);
router.get("/:token", DepositAddressController.getByToken);
router.post("/update", admin, DepositAddressController.update);

// User deposit routes
router.post("/deposits", upload.single("screenshot"), createDeposit);
router.get("/deposits", getUserDeposits);


router.get("/admin/deposits", admin, DepositAddressController.getAllDeposits);
router.put("/admin/deposits/status", admin, DepositAddressController.updateDepositStatus);

export default router;