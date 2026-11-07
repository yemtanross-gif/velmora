# VELMORA — Split Architecture (Ready for Render)

Premium hybrid crypto wallet platform split into **3 independent apps**:

```
velmora/
├── server/            → Backend API (Express + Prisma)
├── client/            → User Frontend (customer wallet app)
├── admin-frontend/    → Admin Frontend (Owner / Support dashboard)
└── docs/
```

---

## 1. Backend (`server/`)

- Express + Prisma + JWT auth
- Roles: USER / SUPPORT / OWNER
- Wallets, ledger, transactions, audit log
- Xellar custodial scaffold
- Port: 4000 (local)

## 2. User Frontend (`client/`)

- Original Velmora self-custody wallet (create / import / unlock / send / receive)
- Will later connect to the API for custodial + connected wallets
- Port: 5173 (local)

## 3. Admin Frontend (`admin-frontend/`)

- Separate secure dashboard
- Login restricted to OWNER and SUPPORT
- Pages: Dashboard, Users, Transactions, Audit Log
- Owner can suspend users; Support is read-mostly
- Port: 5174 (local)

---

## Deploy on Render (Recommended)

You will create **3 services** (or 4 if you add Postgres):

### A. PostgreSQL Database
1. New → PostgreSQL
2. Copy the **Internal Database URL**

### B. Backend API
1. New → Web Service
2. Connect your GitHub repo
3. **Root Directory**: `server`
4. **Build Command**: `npm install && npx prisma generate`
5. **Start Command**: `npx prisma db push && npm run start`
6. Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=   ← paste Internal Database URL
   JWT_SECRET=     ← long random string
   CLIENT_ORIGIN=https://your-user-frontend.onrender.com
   ADMIN_ORIGIN=https://your-admin-frontend.onrender.com
   OWNER_EMAIL=your@email.com
   ```
7. Generate a public URL (e.g. `https://velmora-api.onrender.com`)

### C. User Frontend
1. New → Static Site (or Web Service)
2. **Root Directory**: `client`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. Environment Variable:
   ```
   VITE_API_URL=https://velmora-api.onrender.com
   ```

### D. Admin Frontend
1. New → Static Site
2. **Root Directory**: `admin-frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. Environment Variable:
   ```
   VITE_API_URL=https://velmora-api.onrender.com
   ```

---

## Local Development

```bash
# Terminal 1 – Backend
cd server
cp .env.example .env   # fill values
npm install
npx prisma generate
npx prisma db push
npm run dev

# Terminal 2 – User Frontend
cd client
npm install
npm run dev            # http://localhost:5173

# Terminal 3 – Admin Frontend
cd admin-frontend
npm install
npm run dev            # http://localhost:5174
```

---

## Important Notes

- Free Render web services **sleep after 15 minutes** of inactivity.
- For production money, upgrade to a paid instance so the API stays awake.
- Never put Xellar secrets or JWT_SECRET in the frontend.
- Only the Owner account (created via env) has full control.

---

## Next Steps After Deploy

1. Create the first Owner user (seed script or direct DB insert).
2. Point both frontends to the live API URL.
3. Test login on Admin panel with Owner credentials.
4. Wire live Xellar credentials when ready.
