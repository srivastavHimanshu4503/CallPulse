import { Router } from "express";
import { CrmController } from "./crm.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router: Router = Router();
const controller = new CrmController();

// Protect all CRM workspace endpoints by JWT validation and isolated tenant mapping
router.use(authMiddleware);
router.use(tenantMiddleware);

// Contacts endpoints
router.get("/contacts", controller.getContacts);
router.post("/contacts", controller.createContact);
router.get("/contacts/:id", controller.getContactDetails);
router.post("/contacts/:contactId/notes", controller.createNote);
router.post("/contacts/:contactId/bookings", controller.createBooking);
router.put("/contacts/:contactId/custom-fields", controller.updateContactCustomFields);

// Deals/Pipeline endpoints
router.get("/deals", controller.getDeals);
router.post("/deals", controller.createDeal);
router.put("/deals/:id/stage", controller.updateDealStage);

// Custom fields manager endpoints
router.get("/custom-fields", controller.getCustomFields);
router.post("/custom-fields", controller.createCustomField);

export const crmRouter = router;
export default crmRouter;
