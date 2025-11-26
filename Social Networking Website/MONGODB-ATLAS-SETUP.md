# MongoDB Atlas Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Free Account

1. Visit: https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google account
3. Choose the **FREE** tier (no credit card required)

### Step 2: Create a Cluster

1. After login, click **"Build a Database"**
2. Choose **"M0 FREE"** tier
3. Select a cloud provider (AWS, Google Cloud, or Azure)
4. Choose a region close to you
5. Click **"Create Cluster"**
6. Wait 3-5 minutes for cluster to be created

### Step 3: Create Database User

1. Click **"Database Access"** in left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Create username: `socialnetwork`
5. Create password: `yourSecurePassword123` (remember this!)
6. Set privileges to **"Read and write to any database"**
7. Click **"Add User"**

### Step 4: Allow Network Access

1. Click **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
   - This adds `0.0.0.0/0` 
   - ⚠️ For production, restrict to specific IPs
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Go back to **"Database"** (click "Database" in left sidebar)
2. Click **"Connect"** button on your cluster
3. Select **"Connect your application"**
4. Make sure **"Node.js"** and version **"6.3 or later"** is selected
5. Copy the connection string

It will look like:
```
mongodb+srv://socialnetwork:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Step 6: Update database.js

1. Open `database.js`
2. Find this line:
```javascript
const url = 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority';
```

3. Replace with your actual connection string:
```javascript
const url = 'mongodb+srv://socialnetwork:yourSecurePassword123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority';
```

**Important**: 
- Replace `<password>` with your actual password
- Replace `cluster0.xxxxx` with your actual cluster address
- Keep the `?retryWrites=true&w=majority` at the end

### Example

If your username is `socialnetwork`, password is `Pass123`, and cluster is `cluster0.abc12.mongodb.net`:

```javascript
const url = 'mongodb+srv://socialnetwork:Pass123@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority';
```

### Step 7: Start Your Server

```bash
npm start
```

You should see:
```
Connected successfully to MongoDB
Server is running on http://localhost:3000
```

## Troubleshooting

### "Authentication failed"
- Check username and password are correct
- Make sure you replaced `<password>` with actual password
- Password might contain special characters - URL encode them

### "Connection timeout"
- Check Network Access allows your IP (0.0.0.0/0)
- Wait a few minutes for cluster to finish deploying
- Check your internet connection

### "Database not found"
- This is OK! Database will be created automatically when you first insert data
- Just register a user and it will create the database

### Special Characters in Password

If your password has special characters, URL encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`

Example: Password `MyP@ss#123` becomes `MyP%40ss%23123`

## Benefits of MongoDB Atlas

✅ **No local installation needed**
✅ **Free forever (M0 tier)**
✅ **Automatic backups**
✅ **Access from anywhere**
✅ **Built-in monitoring**
✅ **Easy to scale**

## View Your Data

1. Go to MongoDB Atlas Dashboard
2. Click **"Browse Collections"**
3. Select `socialNetworkDB` database
4. View your collections: `users`, `contents`, `follows`, `images`

## Export Database

### From Atlas Dashboard
1. Click your cluster name
2. Click **"Collections"**
3. Click **"..." menu** → **"Export Collection"**
4. Choose JSON format

### Using mongodump (requires MongoDB tools)
```bash
mongodump --uri="mongodb+srv://socialnetwork:Pass123@cluster0.abc12.mongodb.net/socialNetworkDB"
```

## Security Tips

⚠️ **For Development:**
- Allow access from anywhere (0.0.0.0/0) is fine

⚠️ **For Production:**
- Use specific IP addresses only
- Use environment variables for credentials
- Rotate passwords regularly
- Enable audit logging

## Need Help?

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Connection Troubleshooting: https://docs.atlas.mongodb.com/troubleshoot-connection/

---

**Ready? Set up your Atlas cluster, update the connection string, and start your server!** 🚀
