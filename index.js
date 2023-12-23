const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { mobile } = require("./data.json");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usersFilePath = path.join(__dirname, "users.json");
const stripe = require("stripe")("sk_test_51OQNSTSJ34HTlRfMu1MhPXqFJq5NjwnDZK1eOs9pmweib7vC6XuLGDjpAKeQ3lcPZkD2EfrMyJYhukZUUTgisOhE00uH9BIH6i");
dotenv.config();
const secretKey = process.env.JWT_SECRET;
const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

app.get("/products", (req, res) => {
  try {
    res.json(mobile);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// payment
app.post("/create-checkout-session", async (req, res) => {
  const { products } = req.body;
  console.log(products);
  const lineItems = products.map((product) => ({
    price_data: {
      currency: "usd",
      product_data: { name: product.name },
      unit_amount: product.price * 100,
    },
   quantity:1, 
   
  }));
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `https://mobile-kart-frontend.vercel.app/success`,
    cancel_url: `https://mobile-kart-frontend.vercel.app/cancel`,
  });
 
  res.json({id:session.id})
});
// Load existing users from users.json or create an empty array
let users = [];
if (fs.existsSync(usersFilePath)) {
  const usersData = fs.readFileSync(usersFilePath);
  users = JSON.parse(usersData);
}
// Save users to users.json file
const saveUsersToFile = () => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};
// Register route
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(401).json({ message: "Please fill all the fields " });
    }
    // Check if user exists
    if (
      users.some((user) => user.username === username || user.email === email)
    ) {
      return res.status(400).json({ message: "User already exists" });
    }
    console.log("user checked ");
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("password hashed");
    // Create new user object

    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
    };
    users.push(newUser);
    saveUsersToFile();

    console.log("user added to array");
    console.log("new array updated", users);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user" });
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = users.find((user) => user.username === username);
    console.log("user checked");
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("pass matched");
    console.log("secretkey", secretKey);
    if (passwordMatch) {
      // Create JWT token
      console.log("inside if condition for match pass");
      const token = jwt.sign({ userId: user.id }, secretKey, {
        expiresIn: "1h",
      });
      console.log("token generated", token);
      console.log("response sent,backend ok");
      return res.status(200).json({ token });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
