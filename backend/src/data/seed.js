export const seedData = {
  branches: [
    { id: "branch-downtown", name: "Downtown" },
    { id: "branch-airport", name: "Airport" },
    { id: "branch-warehouse", name: "Warehouse" },
  ],
  categories: [
    {
      id: "cat-electronics",
      name: "Electronics",
      description: "Computers, phones, and accessories",
      productCount: 4,
      color: "#3b82f6",
    },
    {
      id: "cat-office",
      name: "Office Supplies",
      description: "Paper, pens, and organizational tools",
      productCount: 3,
      color: "#10b981",
    },
  ],
  users: [
    {
      id: "user-admin",
      name: "Administrator",
      username: "admin",
      password: "$2a$10$Gq6D2q1M5u8bR1Cw2q1dVOD3uS2oY5t0f2dN6QdZ5xF8K4m5nSx5y",
      role: "admin",
    },
    {
      id: "user-manager",
      name: "Manager",
      username: "manager",
      password: "$2b$10$l7.ual.Xr761yUj57kPMC.uSARnjO9AVR8vVnNwTG0Gurljh0k6ae",
      role: "manager",
    },
    {
      id: "user-executive",
      name: "Executive",
      username: "executive",
      password: "$2a$10$E6Qv5jQW0z1oG2q9Q6i2W.fk7U7C1j3R5g9pL1mQb2nH7rP1nM0a",
      role: "executive",
    },
  ],
};
