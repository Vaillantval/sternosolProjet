
import express from 'express'

const router = express.Router();

// 5. Get Group for User
router.get("/group/:userId", async (req, res) => {
  try {
    const rows = await query(
      `SELECT g.*
       FROM participants p
       JOIN groupes g ON g.id = p.groupeId  
       WHERE p.userId = ? LIMIT 1`,
      [req.params.userId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;