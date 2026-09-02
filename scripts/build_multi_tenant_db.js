const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const coffeenityMenu = [
  // 1. Wood-Fired Pizza (Doughboy Pizza Kayu Api)
  // A. Doughboy Original (12" Large only)
  {
    id: "pizza_margherita",
    name: "Margherita Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "Doughboy Original",
    price: 10.00,
    badge: "Classic",
    badgeClass: "popular",
    desc: "Fresh mozzarella, basil segar, dan tomato sauce istimewa dipanggang kayu api.",
    image: "assets/products/pizza_margherita.jpg",
    available: true,
    flavorProfile: "Crispy Wood-Fired Crust, Fresh Basil, Melty Mozzarella, Rich Tomato",
    pairings: ["sig_garden_mojito", "tea_lychee", "coffee_americano"],
    upsellHook: "Nikmati dengan segarnya Garden Mojito atau Lychee Tea dingin.",
    dietary: ["Vegetarian", "Wood-Fired Oven"],
    customizations: {
      size: [
        { name: "Large (12 inch)", price: 0 }
      ],
      addons: [
        { name: "Extra Mozzarella", price: 2.00 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "pizza_creamy_mushroom",
    name: "Creamy Mushroom Chicken Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "Doughboy Original",
    price: 13.00,
    badge: "Best Seller",
    badgeClass: "bestseller",
    desc: "Tender chicken, mushroom melimpah, saus creamy gurih, dan lelehan mozzarella.",
    image: "assets/products/pizza_truffle.jpg",
    available: true,
    flavorProfile: "Rich Creamy Sauce, Savory Chicken, Sauteed Mushrooms, Mozzarella",
    pairings: ["tea_peach", "sig_garden_mojito", "coffee_latte"],
    upsellHook: "Sangat nikmat dipadukan dengan Peach Tea dingin menyegarkan.",
    dietary: ["Best Seller", "Chef Signature"],
    customizations: {
      size: [
        { name: "Large (12 inch)", price: 0 }
      ],
      addons: [
        { name: "Extra Mozzarella", price: 2.00 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "pizza_hawaiian",
    name: "Hawaiian Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "Doughboy Original",
    price: 13.00,
    badge: "Popular",
    badgeClass: "popular",
    desc: "Savory ham, crispy bacon, potongan nanas segar manis, mozzarella, dan tomato sauce.",
    image: "assets/products/pizza_fourcheese.jpg",
    available: true,
    flavorProfile: "Sweet Juicy Pineapple, Smoky Bacon, Ham, Tangy Tomato Base",
    pairings: ["tea_passionate", "sig_orange_americano"],
    upsellHook: "Cocok ditemani Passionate Tea untuk sensasi tropis yang seimbang.",
    dietary: ["Meat Lovers", "House Special"],
    customizations: {
      size: [
        { name: "Large (12 inch)", price: 0 }
      ],
      addons: [
        { name: "Extra Cheese", price: 2.00 },
        { name: "Extra Pineapple", price: 1.00 }
      ]
    }
  },

  // B. House Favorites (Regular 9" $8.00 / Large 12" $14.00)
  {
    id: "pizza_pepperoni",
    name: "Pepperoni Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "House Favorites",
    price: 8.00,
    badge: "Classic",
    badgeClass: "popular",
    desc: "Savory beef pepperoni, capsicum renyah, tomato sauce kaya rempah, dan mozzarella panggang.",
    image: "assets/products/pizza_pepperoni.jpg",
    available: true,
    flavorProfile: "Crispy Pepperoni, Smoky Char, Herb Tomato, Melty Mozzarella",
    pairings: ["sig_garden_mojito", "tea_strawberry", "coffee_spanish_latte"],
    upsellHook: "Pasangan terbaik dengan Garden Mojito dingin atau Spanish Latte.",
    dietary: ["Best Seller", "Signature"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 6.00 }
      ],
      addons: [
        { name: "Extra Pepperoni", price: 2.00 },
        { name: "Extra Mozzarella", price: 2.00 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "pizza_honey_garlic",
    name: "Honey Garlic Chicken Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "House Favorites",
    price: 8.00,
    badge: "Special Sauce",
    badgeClass: "popular",
    desc: "Juicy chicken fillet diselimuti honey garlic sauce manis gurih spesial, capsicum, mozzarella.",
    image: "assets/products/pizza_pepperoni.jpg",
    available: true,
    flavorProfile: "Sweet Honey Glaze, Roasted Garlic, Tender Chicken, Melted Cheese",
    pairings: ["tea_lychee", "coffee_signature_latte"],
    upsellHook: "Sempurnakan dengan Lychee Tea atau House Signature Latte.",
    dietary: ["House Favorite"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 6.00 }
      ],
      addons: [
        { name: "Extra Cheese", price: 2.00 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "pizza_tuna_mayo",
    name: "Tuna Mayo Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "House Favorites",
    price: 8.00,
    badge: "Signature",
    badgeClass: "popular",
    desc: "Flaked tuna mixed mayo special sauce, capsicum, bombay onion manis, dan mozzarella.",
    image: "assets/products/pizza_fourcheese.jpg",
    available: true,
    flavorProfile: "Creamy Tuna Mayo, Sweet Onion Crunch, Rich Mozzarella",
    pairings: ["tea_peach", "sig_yard_latte"],
    upsellHook: "Kombinasi mantap dengan Yard Latte khas The Coffeenity Yard.",
    dietary: ["Seafood", "Signature"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 6.00 }
      ],
      addons: [
        { name: "Extra Cheese", price: 2.00 },
        { name: "Extra Mayo", price: 0.50 }
      ]
    }
  },
  {
    id: "pizza_bbq_chicken",
    name: "BBQ Chicken Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "House Favorites",
    price: 8.00,
    badge: "Favorite",
    badgeClass: "popular",
    desc: "Grilled chicken, saus BBQ asap smoky autentik, irisan onion, dan mozzarella gurih.",
    image: "assets/products/pizza_pepperoni.jpg",
    available: true,
    flavorProfile: "Smoky Barbecue, Sweet Onion, Tender Chicken Breast, Cheesy Crust",
    pairings: ["sig_garden_mojito", "coffee_americano"],
    upsellHook: "Sangat pas ditemani Iced Americano atau Garden Mojito.",
    dietary: ["Favorite"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 6.00 }
      ],
      addons: [
        { name: "Extra Mozzarella", price: 2.00 },
        { name: "Extra BBQ Sauce", price: 0.80 }
      ]
    }
  },
  {
    id: "pizza_burger",
    name: "Burger Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "House Favorites",
    price: 8.00,
    badge: "Best Seller",
    badgeClass: "bestseller",
    desc: "Premium minced beef patty, classic burger sauce istimewa, mozzarella, pickle asam segar, tomat.",
    image: "assets/products/beef_burger.jpg",
    available: true,
    flavorProfile: "Juicy Ground Beef, Tangy Pickles, Classic Secret Burger Sauce, Cheesy Wood-Fired Dough",
    pairings: ["sig_garden_mojito", "coffee_signature_latte", "snack_fries"],
    upsellHook: "Lengkapi dengan Fries dan Garden Mojito untuk sensasi burger-pizza paripurna.",
    dietary: ["Best Seller", "Chef Recommended"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 6.00 }
      ],
      addons: [
        { name: "Extra Beef Patty", price: 2.50 },
        { name: "Extra Mozzarella", price: 2.00 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },

  // C. Loaded Legends (Regular 9" $9.00 / Large 12" $16.00)
  {
    id: "pizza_4_cheese",
    name: "4 Cheese Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "Loaded Legends",
    price: 9.00,
    badge: "Cheesy",
    badgeClass: "popular",
    desc: "Tomato base kaya rasa, perpaduan lumer 4 keju premium: mozzarella, cheddar, ricotta, dan parmesan.",
    image: "assets/products/pizza_fourcheese.jpg",
    available: true,
    flavorProfile: "Intense Quattro Formaggi, Creamy Ricotta, Sharp Cheddar, Nutty Parmesan, Stringy Mozzarella",
    pairings: ["sig_honey_bee_latte", "tea_strawberry"],
    upsellHook: "Sangat serasi dinikmati bersama Honey Bee Latte atau Strawberry Tea.",
    dietary: ["Vegetarian", "Cheesy Loaded"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 7.00 }
      ],
      addons: [
        { name: "Truffle Honey Drizzle", price: 1.50 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "pizza_supermeat",
    name: "Supermeat Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "Loaded Legends",
    price: 9.00,
    badge: "Meat Lovers",
    badgeClass: "bestseller",
    desc: "Loaded ground beef, savory ham, crispy bacon, capsicum, dan tomato base kaya bumbu.",
    image: "assets/products/pizza_pepperoni.jpg",
    available: true,
    flavorProfile: "Heavy Savory Meat Feast, Smoky Bacon Crunch, Hearty Beef, Robust Herb Sauce",
    pairings: ["sig_garden_mojito", "coffee_americano"],
    upsellHook: "Padukan dengan Garden Mojito dingin untuk menetralisir rasa daging gurih.",
    dietary: ["Meat Lovers"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 7.00 }
      ],
      addons: [
        { name: "Extra Mozzarella", price: 2.00 },
        { name: "Extra Bacon", price: 2.00 }
      ]
    }
  },
  {
    id: "pizza_salmon_mentai",
    name: "Salmon Mentai Pizza",
    category: "pizza",
    categoryLabel: "Wood-Fired Pizza",
    subCategory: "Loaded Legends",
    price: 9.00,
    badge: "Best Seller",
    badgeClass: "bestseller",
    desc: "Creamy torched mentai mayo, smoked salmon pilihan, taburan seaweed nori flakes, dan fresh basil.",
    image: "assets/products/salmon_poke_bowl.jpg",
    available: true,
    flavorProfile: "Torched Savory Mentai, Umami Smoked Salmon, Roasted Seaweed, Sweet-Creamy Mayo",
    pairings: ["matcha_classic", "matcha_ichigo", "tea_lychee"],
    upsellHook: "Wajib dicoba bersama Classic Matcha atau Matcha Ichigo.",
    dietary: ["Best Seller", "Signature Seafood"],
    customizations: {
      size: [
        { name: "Regular (9 inch)", price: 0 },
        { name: "Large (12 inch)", price: 7.00 }
      ],
      addons: [
        { name: "Extra Smoked Salmon", price: 3.00 },
        { name: "Extra Mentai Sauce", price: 1.50 }
      ]
    }
  },

  // 2. Calzone & Indomee Custom Bar
  {
    id: "calzone_tuna_cheese",
    name: "Tuna Cheese Calzone",
    category: "calzone_indomee",
    categoryLabel: "Calzone & Indomee",
    subCategory: "Calzone",
    price: 6.00,
    badge: "Specialty",
    badgeClass: "popular",
    desc: "Pizza lipat panggang khas Italia dengan isian tuna gurih, lelehan keju lumer, dan saus rempah.",
    image: "assets/products/truffle_croissant.jpg",
    available: true,
    flavorProfile: "Crispy Baked Crust, Steamy Melted Cheese, Savory Seasoned Tuna",
    pairings: ["tea_lychee", "sig_garden_mojito"],
    upsellHook: "Segarkan dengan Lychee Tea atau Iced Latte.",
    dietary: ["Italian Baked"],
    customizations: {
      addons: [
        { name: "Extra Cheese", price: 1.50 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "calzone_meatlover",
    name: "Meatlover Calzone",
    category: "calzone_indomee",
    categoryLabel: "Calzone & Indomee",
    subCategory: "Calzone",
    price: 6.00,
    badge: "Popular",
    badgeClass: "popular",
    desc: "Pizza lipat panggang dengan isian padat aneka olahan daging sapi, bacon, dan double mozzarella.",
    image: "assets/products/beef_burger.jpg",
    available: true,
    flavorProfile: "Loaded Beef & Bacon, Warm Rich Mozzarella, Pocket Crust",
    pairings: ["coffee_americano", "sig_garden_mojito"],
    upsellHook: "Nikmati bersama Americano dingin atau Mojito.",
    dietary: ["Meat Lovers"],
    customizations: {
      addons: [
        { name: "Extra Cheese", price: 1.50 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "indomee_custom_bar",
    name: "Indomee Custom Bar",
    category: "calzone_indomee",
    categoryLabel: "Calzone & Indomee",
    subCategory: "Indomee Bar",
    price: 2.00,
    badge: "Customizable",
    badgeClass: "popular",
    desc: "Indomie racikan kafe dengan bumbu sedap khas, siap dipadukan dengan topping favorit Anda.",
    image: "assets/products/nasi_ayam_bakar.jpg",
    available: true,
    flavorProfile: "Savory Indonesian Noodle, Crispy Shallots, Aromatic Garlic",
    pairings: ["bev_pot_of_tea", "tea_peach"],
    upsellHook: "Tambahkan topping Telur (+$1.00) atau Kerang Baby Clam (+$2.00) untuk rasa maksimal.",
    dietary: ["Comfort Food"],
    customizations: {
      addons: [
        { name: "Telur (+Egg)", price: 1.00 },
        { name: "Kerang (+Baby Clam)", price: 2.00 }
      ],
      spiciness: ["Biasa / Normal", "Pedas Gurih (+Cabai Rawit)"]
    }
  },

  // 3. Breakfast Plates & Specialties
  {
    id: "breakfast_bigboy",
    name: "Bigboy Breakfast",
    category: "breakfast",
    categoryLabel: "Breakfast Plates",
    subCategory: "All-Day Breakfast",
    price: 12.50,
    badge: "Chef Signature",
    badgeClass: "bestseller",
    desc: "Loaded breakfast plate: toasted bread, beef salami, sausage, fluffy omelette, sauteed mushrooms, baked beans, dan cherry tomatoes.",
    image: "assets/products/avocado_toast.jpg",
    available: true,
    flavorProfile: "Full English Cafe Style, Savory Salami & Sausage, Velvety Omelette, Sweet Baked Beans",
    pairings: ["coffee_latte", "filter_v60", "coffee_americano"],
    upsellHook: "Pasangan wajib sarapan dengan Hot Latte atau V60 Pour Over.",
    dietary: ["All-Day Breakfast", "Signature"],
    customizations: {
      eggStyle: ["Fluffy Omelette", "Sunny Side Up (Mata Sapi)", "Scrambled Eggs"],
      addons: [
        { name: "Extra Sausage", price: 2.50 },
        { name: "Extra Toast", price: 1.50 }
      ]
    }
  },
  {
    id: "breakfast_classic_rise",
    name: "Classic Rise",
    category: "breakfast",
    categoryLabel: "Breakfast Plates",
    subCategory: "All-Day Breakfast",
    price: 9.50,
    badge: "Classic",
    badgeClass: "popular",
    desc: "Piring sarapan klasik: sunny eggs (telur mata sapi), baked beans, grilled tomatoes, sausage, dan toasted bread hangat.",
    image: "assets/products/avocado_toast.jpg",
    available: true,
    flavorProfile: "Runny Golden Yolks, Charred Juicy Sausage, Tangy Tomato, Toasted Sourdough",
    pairings: ["coffee_americano", "coffee_cappuccino"],
    upsellHook: "Lengkapi pagi Anda dengan Cappuccino atau Americano hangat.",
    dietary: ["Breakfast Classic"],
    customizations: {
      eggStyle: ["Sunny Side Up (Setengah Matang)", "Sunny Side Up (Matang Penuh)", "Scrambled"],
      addons: [
        { name: "Extra Sausage", price: 2.50 }
      ]
    }
  },
  {
    id: "breakfast_egg_and_dip",
    name: "Egg and Dip",
    category: "breakfast",
    categoryLabel: "Breakfast Plates",
    subCategory: "All-Day Breakfast",
    price: 7.50,
    badge: "Favorite",
    badgeClass: "popular",
    desc: "Toasted bread renyah disajikan dengan fluffy milk omelette lembut bertabur gurihnya savory tobiko.",
    image: "assets/products/avocado_toast.jpg",
    available: true,
    flavorProfile: "Creamy Fluffy Milk Eggs, Crunchy Popping Tobiko, Golden Garlic Butter Toast",
    pairings: ["coffee_flat_white", "sig_yard_latte"],
    upsellHook: "Padukan dengan Flat White atau Yard Latte.",
    dietary: ["Signature Egg Plate"],
    customizations: {
      addons: [
        { name: "Extra Tobiko", price: 2.00 },
        { name: "Extra Toast", price: 1.50 }
      ]
    }
  },
  {
    id: "breakfast_golden_stack_toast",
    name: "Golden Stack French Toast",
    category: "breakfast",
    categoryLabel: "Breakfast Plates",
    subCategory: "Sweet Breakfast",
    price: 6.50,
    badge: "Sweet Tooth",
    badgeClass: "popular",
    desc: "Roti celup telur tebal keemasan disiram melted butter gurih manis, disajikan hangat wangi.",
    image: "assets/products/fudge_brownie.jpg",
    available: true,
    flavorProfile: "Golden Custardy Toast, Rich Melted Maple Butter, Warm Vanilla Cinnamon Fragrance",
    pairings: ["coffee_americano", "coffee_signature_latte"],
    upsellHook: "Sangat kontras dan nikmat dinikmati bersama Hot Americano tanpa gula.",
    dietary: ["Sweet Breakfast"],
    customizations: {
      addons: [
        { name: "Add Vanilla Ice Cream Scoop", price: 1.50 },
        { name: "Extra Maple Butter", price: 1.00 }
      ]
    }
  },
  {
    id: "breakfast_sunny_pan_pizza",
    name: "The Sunny-Pan Pizza",
    category: "breakfast",
    categoryLabel: "Breakfast Plates",
    subCategory: "Specialty",
    price: 8.00,
    badge: "Specialty",
    badgeClass: "bestseller",
    desc: "Prata wrap renyah dengan isian sunny-side-up eggs, beef pepperoni, dan zaitun hitam (olives).",
    image: "assets/products/pizza_pepperoni.jpg",
    available: true,
    flavorProfile: "Flaky Prata Crust, Runny Yolks, Spicy Savory Pepperoni, Mediterranean Olives",
    pairings: ["coffee_spanish_latte", "sig_brulee_latte"],
    upsellHook: "Menu sarapan unik yang nikmat disandingkan dengan Spanish Latte.",
    dietary: ["House Specialty"],
    customizations: {
      addons: [
        { name: "Extra Cheese", price: 1.50 }
      ]
    }
  },

  // 4. Snacks, Sides, Churros & Waffle
  {
    id: "snack_beef_nachos",
    name: "Beef Nachos",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Savory Bites",
    price: 5.00,
    badge: "Sharing",
    badgeClass: "popular",
    desc: "Tortilla chips renyah bertabur saus daging sapi gurih cincang, lelehan keju, dan salsa.",
    image: "assets/products/french_fries.jpg",
    available: true,
    flavorProfile: "Crunchy Corn Tortilla, Savory Seasoned Minced Beef, Warm Nacho Cheese",
    pairings: ["sig_garden_mojito", "tea_passionate"],
    upsellHook: "Sempurna untuk sharing bersama teman sambil minum Garden Mojito.",
    dietary: ["Snack Sharing"],
    customizations: {
      addons: [
        { name: "Extra Cheese Sauce", price: 1.00 },
        { name: "Extra Jalapeno", price: 0.80 }
      ]
    }
  },
  {
    id: "snack_sandwich",
    name: "Sandwich (Egg / Tuna)",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Savory Bites",
    price: 3.50,
    badge: "Popular",
    badgeClass: "popular",
    desc: "Sandwich roti lembut dengan pilihan isian: Egg Mayo lembut atau Tuna Mayo gurih.",
    image: "assets/products/beef_burger.jpg",
    available: true,
    flavorProfile: "Fresh Toasted Loaf, Creamy Egg or Seasoned Tuna Mayo, Crisp Lettuce",
    pairings: ["coffee_americano", "coffee_latte"],
    upsellHook: "Pilihan sarapan praktis ditemani Hot Latte.",
    dietary: ["Quick Bites"],
    customizations: {
      filling: [
        { name: "Egg Mayo", price: 0 },
        { name: "Tuna Mayo", price: 0 }
      ],
      addons: [
        { name: "Add Cheddar Cheese Slice", price: 0.80 }
      ]
    }
  },
  {
    id: "snack_spinach_cheese_dip",
    name: "Spinach Cheese Dip",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Savory Bites",
    price: 7.00,
    badge: "Specialty Dip",
    badgeClass: "popular",
    desc: "Dip bayam keju kental gurih disajikan dengan keripik tortila pendamping renyah.",
    image: "assets/products/french_fries.jpg",
    available: true,
    flavorProfile: "Rich Garlic Cream Cheese, Tender Spinach, Melty Mozzarella, Warm Dip",
    pairings: ["tea_lychee", "filter_chemex"],
    upsellHook: "Dip keju hangat yang pas dengan segelas Lychee Tea.",
    dietary: ["Vegetarian Dip"],
    customizations: {
      addons: [
        { name: "Extra Tortilla Chips", price: 1.50 }
      ]
    }
  },
  {
    id: "snack_tuna_cheesemelt",
    name: "Tuna Cheesemelt",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Savory Bites",
    price: 3.80,
    badge: "Cheesy",
    badgeClass: "popular",
    desc: "Roti panggang mentega dengan lelehan keju lumer dan isian tuna spesial yang gurih nikmat.",
    image: "assets/products/beef_burger.jpg",
    available: true,
    flavorProfile: "Golden Butter Crust, Melty Cheddar & Mozzarella, Juicy Flaked Tuna",
    pairings: ["coffee_cappuccino", "tea_peach"],
    upsellHook: "Pasangan tepat dengan Cappuccino hangat.",
    dietary: ["Cheesy Melt"],
    customizations: {
      addons: [
        { name: "Extra Cheese", price: 1.00 }
      ]
    }
  },
  {
    id: "snack_fries",
    name: "Fries (Original / Cheese)",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Savory Bites",
    price: 3.00,
    badge: "Favorite",
    badgeClass: "popular",
    desc: "Kentang goreng renyah keemasan dengan pilihan rasa: Original Sea Salt atau Savory Cheese Powder.",
    image: "assets/products/french_fries.jpg",
    available: true,
    flavorProfile: "Crispy Shoestring Potatoes, Fluffy Potato Center, Sea Salt or Savory Cheddar Dust",
    pairings: ["sig_garden_mojito", "pizza_burger"],
    upsellHook: "Sangat pas sebagai cemilan pendamping Burger Pizza dan Garden Mojito.",
    dietary: ["Vegetarian Snack"],
    customizations: {
      flavor: [
        { name: "Original (Sea Salt)", price: 0 },
        { name: "Cheese Seasoning", price: 0 }
      ],
      addons: [
        { name: "Cheese Sauce Dip", price: 1.00 },
        { name: "Garlic Mayo Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "snack_churros_original",
    name: "Churros Original",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Churros & Waffle",
    price: 2.50,
    badge: "Sweet Treat",
    badgeClass: "popular",
    desc: "Churros renyah bertabur gula halus, disajikan lengkap dengan Chocolate Dip hangat.",
    image: "assets/products/cinnamon_roll.jpg",
    available: true,
    flavorProfile: "Crispy Ridged Pastry, Soft Tender Inside, Warm Silky Dark Chocolate Dip",
    pairings: ["coffee_americano", "coffee_signature_latte"],
    upsellHook: "Churros sudah dapat chocolate dip hangat. Mau sekalian kopi seperti Americano?",
    dietary: ["Sweet Pastry"],
    customizations: {
      addons: [
        { name: "Extra Chocolate Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "snack_churros_cinnamon",
    name: "Churros Cinnamon",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Churros & Waffle",
    price: 3.00,
    badge: "Aromatic",
    badgeClass: "popular",
    desc: "Churros renyah diselimuti gula kayu manis beraroma harum, lengkap dengan Chocolate Dip hangat.",
    image: "assets/products/cinnamon_roll.jpg",
    available: true,
    flavorProfile: "Sweet Cinnamon Sugar Dusting, Fragrant Spice, Rich Chocolate Fondue",
    pairings: ["coffee_latte", "coffee_spanish_latte"],
    upsellHook: "Aroma cinnamon hangat berpadu sempurna dengan Spanish Latte.",
    dietary: ["Sweet Pastry"],
    customizations: {
      addons: [
        { name: "Extra Chocolate Dip", price: 1.00 }
      ]
    }
  },
  {
    id: "snack_waffle",
    name: "Waffle (Custom Spread)",
    category: "snacks_waffle",
    categoryLabel: "Snacks & Waffle",
    subCategory: "Churros & Waffle",
    price: 2.50,
    badge: "Custom Spread",
    badgeClass: "bestseller",
    desc: "Waffle hangat renyah di luar lembut di dalam. Wajib pilih 1 spread favorit Anda.",
    image: "assets/products/almond_croissant.jpg",
    available: true,
    flavorProfile: "Warm Honeycomb Waffle, Golden Crust, Rich Choice of Sweet Spread",
    pairings: ["coffee_americano", "sig_yard_latte", "coffee_mocha"],
    upsellHook: "Waffle lezat sangat serasi dengan House Signature Latte atau Americano.",
    dietary: ["Sweet Snack"],
    customizations: {
      spread: [
        { name: "Kaya", price: 0 },
        { name: "Peanut Butter", price: 0 },
        { name: "Chocolate", price: 0 },
        { name: "Planta", price: 0 }
      ],
      addons: [
        { name: "Extra Spread (+1 Varian)", price: 0.80 },
        { name: "Add Vanilla Ice Cream Scoop", price: 1.50 }
      ]
    }
  },

  // 5. Espresso-Based Coffee (Base Hot, Iced +$0.50)
  {
    id: "coffee_americano",
    name: "Americano",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Espresso Classics",
    price: 3.50,
    badge: "Clean Brew",
    badgeClass: "popular",
    desc: "Double shot espresso arabika dengan air murni, menghasilkan rasa kopi bersih dan aromatik.",
    image: "assets/products/americano.jpg",
    available: true,
    flavorProfile: "Dark Cocoa, Roasted Hazelnut, Clean Crisp Finish",
    pairings: ["pizza_pepperoni", "snack_churros_original", "snack_waffle"],
    upsellHook: "Kopi bersih untuk menyeimbangkan manisnya Churros atau gurihnya Pepperoni.",
    dietary: ["Low Calorie", "Sugar Free"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      sugar: ["No Sugar (0%)", "Less Sugar (50%)", "Normal Sugar (100%)"],
      addons: [
        { name: "Extra Espresso Shot", price: 1.00 }
      ]
    }
  },
  {
    id: "coffee_latte",
    name: "Caffe Latte",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Espresso Classics",
    price: 5.00,
    badge: "Classic",
    badgeClass: "popular",
    desc: "Espresso seimbang dipadu dengan steamed fresh milk halus bertekstur microfoam lembut.",
    image: "assets/products/caffe_latte.jpg",
    available: true,
    flavorProfile: "Velvety Fresh Milk, Nutty Arabica, Smooth Sweet Finish",
    pairings: ["snack_waffle", "breakfast_bigboy"],
    upsellHook: "Pasangan sarapan sejati dengan Bigboy Breakfast.",
    dietary: ["Classic Coffee"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      milk: ["Fresh Milk", "Oat Milk (+ $1.00)"],
      sugar: ["No Sugar (0%)", "Less Sugar (50%)", "Normal Sugar (100%)"],
      addons: [
        { name: "Extra Espresso Shot", price: 1.00 }
      ]
    }
  },
  {
    id: "coffee_flat_white",
    name: "Flat White",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Espresso Classics",
    price: 5.00,
    badge: "Bold & Smooth",
    badgeClass: "popular",
    desc: "Ristretto ganda pekat dengan lapisan tipis microfoam susu yang sangat lembut.",
    image: "assets/products/caffe_latte.jpg",
    available: true,
    flavorProfile: "Strong Coffee Forward, Dense Creamy Texture, Sweet Milk Understone",
    pairings: ["breakfast_egg_and_dip", "snack_sandwich"],
    upsellHook: "Karakter kopi lebih tegas, sangat cocok dengan Egg and Dip.",
    dietary: ["Barista Pick"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      milk: ["Fresh Milk", "Oat Milk (+ $1.00)"]
    }
  },
  {
    id: "coffee_cappuccino",
    name: "Cappuccino",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Espresso Classics",
    price: 5.00,
    badge: "Classic",
    badgeClass: "popular",
    desc: "Perpaduan klasik espresso, susu panas, dan busa susu tebal lembut bertabur cokelat.",
    image: "assets/products/caffe_latte.jpg",
    available: true,
    flavorProfile: "Airy Thick Foam, Bold Dark Roast, Cocoa Dust",
    pairings: ["snack_tuna_cheesemelt", "breakfast_classic_rise"],
    upsellHook: "Nikmati bersama Tuna Cheesemelt hangat.",
    dietary: ["Classic Coffee"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      sugar: ["No Sugar (0%)", "Less Sugar (50%)", "Normal Sugar (100%)"]
    }
  },
  {
    id: "coffee_mocha",
    name: "Caffe Mocha",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Espresso Classics",
    price: 5.00,
    badge: "Choco Infusion",
    badgeClass: "popular",
    desc: "Espresso arabika dipadukan dengan cokelat Belgia pekat dan susu segar lembut.",
    image: "assets/products/caramel_macchiato.jpg",
    available: true,
    flavorProfile: "Bittersweet Dark Chocolate, Rich Espresso, Creamy Milk",
    pairings: ["snack_churros_original", "snack_waffle"],
    upsellHook: "Padukan dengan Waffle spread Peanut Butter untuk rasa cokelat kacang mantap.",
    dietary: ["Chocolate Coffee"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      milk: ["Fresh Milk", "Oat Milk (+ $1.00)"]
    }
  },
  {
    id: "coffee_flavored_latte",
    name: "Flavored Latte",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Flavored Coffee",
    price: 5.00,
    badge: "Aromatic",
    badgeClass: "popular",
    desc: "Caffe latte lembut dengan pilihan sirup gourmet: Vanilla, Salted Caramel, atau Roasted Hazelnut.",
    image: "assets/products/caramel_macchiato.jpg",
    available: true,
    flavorProfile: "Aromatic Sweet Vanilla/Caramel/Hazelnut, Smooth Steamed Milk, Balanced Espresso",
    pairings: ["snack_churros_cinnamon", "pizza_creamy_mushroom"],
    upsellHook: "Varian vanilla dan caramel sangat harmonis dengan Churros Cinnamon.",
    dietary: ["Sweet Coffee"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      flavor: ["Vanilla", "Salted Caramel", "Roasted Hazelnut"],
      milk: ["Fresh Milk", "Oat Milk (+ $1.00)"]
    }
  },
  {
    id: "coffee_spanish_latte",
    name: "Spanish Latte",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Signature Coffee",
    price: 5.50,
    badge: "Best Seller",
    badgeClass: "bestseller",
    desc: "Espresso bold dengan susu segar creamy dan sentuhan condensed milk khas Spanyol yang legit.",
    image: "assets/products/kopi_milk_aren.jpg",
    available: true,
    flavorProfile: "Sweet Condensed Milk, Rich Bold Espresso, Extra Creamy Body",
    pairings: ["pizza_pepperoni", "breakfast_sunny_pan_pizza"],
    upsellHook: "Best seller minuman kopi, pasangan pas untuk Pizza Pepperoni!",
    dietary: ["Best Seller", "Signature"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      sugar: ["Normal Sweet (100%)", "Less Sweet (50%)"],
      addons: [
        { name: "Extra Espresso Shot", price: 1.00 }
      ]
    }
  },
  {
    id: "coffee_signature_latte",
    name: "House Signature Latte",
    category: "espresso",
    categoryLabel: "Espresso Coffee",
    subCategory: "Signature Coffee",
    price: 5.50,
    badge: "House Secret",
    badgeClass: "bestseller",
    desc: "Racikan latte rahasia khas The Coffeenity Yard dengan kelembutan rasa karamel butterscotch.",
    image: "assets/products/caramel_macchiato.jpg",
    available: true,
    flavorProfile: "Butterscotch Caramel Notes, Silky Foam, Velvety Espresso Blend",
    pairings: ["snack_waffle", "snack_churros_original"],
    upsellHook: "Cita rasa khas The Coffeenity Yard, sangat pas dengan Waffle hangat.",
    dietary: ["Chef Recommended", "Signature"],
    customizations: {
      temperature: [
        { name: "Hot (Panas)", price: 0 },
        { name: "Iced (Dingin)", price: 0.50 }
      ],
      milk: ["Fresh Milk", "Oat Milk (+ $1.00)"]
    }
  },

  // 6. Filter Coffee (Manual Brew Bar)
  {
    id: "filter_v60",
    name: "V60 Pour-Over",
    category: "filter_coffee",
    categoryLabel: "Filter Coffee",
    subCategory: "Manual Brew Bar",
    price: 5.00,
    badge: "Artisan",
    badgeClass: "popular",
    desc: "Ekstraksi pour-over dengan kertas filter V60 untuk profil rasa jernih (clean cup) dan aroma bunga/buah.",
    image: "assets/products/americano.jpg",
    available: true,
    flavorProfile: "Bright Acidity, Floral Jasmine, Citrus Notes, Ultra Clean Cup",
    pairings: ["breakfast_bigboy", "snack_sandwich"],
    upsellHook: "Kopi manual pour over bagi penikmat rasa kopi murni dan kompleks.",
    dietary: ["Specialty Beans", "Single Origin"],
    customizations: {
      beans: ["Ethiopia Guji (Floral/Citrus)", "Colombia Huila (Chocolate/Caramel)", "House Seasonal Blend"]
    }
  },
  {
    id: "filter_japanese_drip",
    name: "Japanese Drip",
    category: "filter_coffee",
    categoryLabel: "Filter Coffee",
    subCategory: "Manual Brew Bar",
    price: 5.50,
    badge: "Refreshing",
    badgeClass: "popular",
    desc: "Seduh drip manual langsung di atas es batu untuk rasa dingin segar dengan tingkat keasaman buah seimbang.",
    image: "assets/products/americano.jpg",
    available: true,
    flavorProfile: "Flash Chilled, Crisp Fruit Notes, Refreshing Body, Clean Sweetness",
    pairings: ["pizza_margherita", "snack_spinach_cheese_dip"],
    upsellHook: "Kopi filter dingin yang sangat menyegarkan di siang hari.",
    dietary: ["Artisan Iced Coffee"],
    customizations: {
      beans: ["Ethiopia Guji (Fruity)", "House Seasonal Blend"]
    }
  },
  {
    id: "filter_vietnam_drip",
    name: "Vietnam Drip",
    category: "filter_coffee",
    categoryLabel: "Filter Coffee",
    subCategory: "Manual Brew Bar",
    price: 5.00,
    badge: "Bold & Sweet",
    badgeClass: "popular",
    desc: "Kopi tetes tradisional phin drip dengan karakter robusta bold kental, dipadu krimer kental manis legit.",
    image: "assets/products/kopi_milk_aren.jpg",
    available: true,
    flavorProfile: "Intense Bold Dark Roast, Thick Sweet Condensed Milk, Smoky Finish",
    pairings: ["snack_waffle", "breakfast_golden_stack_toast"],
    upsellHook: "Pilihan bagi pecinta kopi pekat manis klasik.",
    dietary: ["Traditional Brew"],
    customizations: {
      serving: ["Hot (Panas)", "Iced (Dingin)"]
    }
  },
  {
    id: "filter_aeropress",
    name: "AeroPress",
    category: "filter_coffee",
    categoryLabel: "Filter Coffee",
    subCategory: "Manual Brew Bar",
    price: 5.00,
    badge: "Rich Body",
    badgeClass: "popular",
    desc: "Metode tekanan udara terkontrol untuk bodi kopi yang tebal dan rasa pekat yang sangat halus.",
    image: "assets/products/americano.jpg",
    available: true,
    flavorProfile: "Syrupy Body, Low Acidity, Rich Cocoa Nib Undertone",
    pairings: ["breakfast_classic_rise"],
    dietary: ["Manual Extraction"],
    customizations: {
      beans: ["House Single Origin", "Seasonal Blend"]
    }
  },
  {
    id: "filter_chemex",
    name: "Chemex",
    category: "filter_coffee",
    categoryLabel: "Filter Coffee",
    subCategory: "Manual Brew Bar",
    price: 6.00,
    badge: "Specialty",
    badgeClass: "popular",
    desc: "Filtrasi kertas tebal khusus untuk profil kopi yang luar biasa jernih tanpa ampas dan keasaman sangat lembut.",
    image: "assets/products/americano.jpg",
    available: true,
    flavorProfile: "Polished Cleanliness, Sweet Berry Aftertaste, Gentle Silky Mouthfeel",
    pairings: ["snack_spinach_cheese_dip", "breakfast_egg_and_dip"],
    dietary: ["Premium Manual Pour"],
    customizations: {
      beans: ["Specialty Reserve Single Origin"]
    }
  },

  // 7. Signature Specialty Drinks & Refresher
  {
    id: "sig_yard_latte",
    name: "Yard Latte",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "House Signatures",
    price: 6.00,
    badge: "House Signature",
    badgeClass: "bestseller",
    desc: "Signature house latte khas The Coffeenity Yard dengan perpaduan espresso, susu oat, dan ekstrak madu vanila.",
    image: "assets/products/caramel_macchiato.jpg",
    available: true,
    flavorProfile: "Vanilla Honey Blossom, Oat Creaminess, Smooth Espresso Base",
    pairings: ["pizza_tuna_mayo", "snack_waffle"],
    upsellHook: "Minuman ikonik The Coffeenity Yard yang wajib Anda cicipi!",
    dietary: ["House Flagship"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_brulee_latte",
    name: "Brulee Latte",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "House Signatures",
    price: 6.00,
    badge: "Creme Brulee",
    badgeClass: "popular",
    desc: "Latte lembut dengan lapisan karamelisasi gula tebu ala creme brulee renyah di bagian atasnya.",
    image: "assets/products/caramel_macchiato.jpg",
    available: true,
    flavorProfile: "Torched Caramel Crust, Custard Milk, Warm Espresso",
    pairings: ["snack_churros_original", "breakfast_golden_stack_toast"],
    upsellHook: "Manis renyah karamel di atas busa susu yang memanjakan lidah.",
    dietary: ["Dessert Coffee"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_honey_bee_latte",
    name: "Honey Bee Latte",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "House Signatures",
    price: 6.00,
    badge: "Natural Honey",
    badgeClass: "popular",
    desc: "Latte lembut dengan pemanis alami 100% madu hutan murni dan taburan pollen harum.",
    image: "assets/products/caffe_latte.jpg",
    available: true,
    flavorProfile: "Floral Pure Honey, Silky Steamed Milk, Delicate Arabica",
    pairings: ["pizza_4_cheese", "snack_waffle"],
    upsellHook: "Madu alami berpadu harmonis dengan 4 Cheese Pizza!",
    dietary: ["Natural Sweetness"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_orange_americano",
    name: "Orange Americano",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "House Signatures",
    price: 5.00,
    badge: "Zesty & Bold",
    badgeClass: "popular",
    desc: "Perpaduan segar sari jeruk asli dingin dengan float double shot espresso bold di atasnya.",
    image: "assets/products/americano.jpg",
    available: true,
    flavorProfile: "Sweet Citrus Tang, Zesty Orange Oil, Dark Espresso Crema, Fizzy Refreshing",
    pairings: ["pizza_hawaiian", "pizza_bbq_chicken"],
    upsellHook: "Sensasi citrus asam manis kopi yang membangkitkan semangat.",
    dietary: ["Refreshing Citrus Coffee"],
    customizations: {
      serving: ["Iced (Dingin)"]
    }
  },
  {
    id: "sig_dirty_taro",
    name: "Dirty Taro",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "House Signatures",
    price: 6.00,
    badge: "Unique Blend",
    badgeClass: "popular",
    desc: "Perpaduan rasa earthy taro manis lembut dengan shot espresso pekat ('dirty' espresso layer).",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Sweet Earthy Taro, Velvety Purple Cream, Bitter Espresso Punch",
    pairings: ["snack_waffle", "snack_fries"],
    dietary: ["Fusion Specialty"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_garden_mojito",
    name: "Garden Mojito",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "Fizzy Refresher",
    price: 5.00,
    badge: "Best Seller",
    badgeClass: "bestseller",
    desc: "Minuman dingin segar daun mint segar, perasan jeruk nipis (lime), sirup tebu, dan soda dingin berbuih.",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Crisp Crushed Mint, Zesty Lime Juice, Sparkling Soda, Ultra Refreshing",
    pairings: ["pizza_pepperoni", "pizza_burger", "pizza_supermeat", "snack_beef_nachos"],
    upsellHook: "Untuk teman makan pizzanya, mau coba Garden Mojito yang dingin segar?",
    dietary: ["Non-Coffee", "Refreshing Fizzy"],
    customizations: {
      serving: ["Iced (Dingin)"],
      sweetness: ["Normal", "Less Sweet"]
    }
  },
  {
    id: "sig_ube_taro",
    name: "Ube Taro",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "Creamy Non-Coffee",
    price: 5.00,
    badge: "Creamy",
    badgeClass: "popular",
    desc: "Minuman creamy lezat dari talas ube ungu khas dengan susu segar manis gurih.",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Velvety Purple Sweet Potato, Sweet Vanilla Cream, Mellow Finish",
    pairings: ["snack_waffle", "snack_churros_original"],
    dietary: ["Non-Coffee"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_bali_taro",
    name: "Bali Taro",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "Creamy Non-Coffee",
    price: 5.00,
    badge: "Tropical",
    badgeClass: "popular",
    desc: "Variasi taro khas dengan cita rasa kelapa creamy tropis dan gula aren gurih.",
    image: "assets/products/kopi_milk_aren.jpg",
    available: true,
    flavorProfile: "Coconut Taro Blend, Palm Sugar Touch, Creamy Island Vibe",
    pairings: ["snack_waffle"],
    dietary: ["Non-Coffee"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_dalgona_saruaso",
    name: "Dalgona Saruaso",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "House Signatures",
    price: 6.00,
    badge: "Whipped Coffee",
    badgeClass: "popular",
    desc: "Racikan dalgona whipped coffee khas yang lembut mengembang di atas susu kelapa dingin Saruaso.",
    image: "assets/products/kopi_milk_aren.jpg",
    available: true,
    flavorProfile: "Whipped Honeycomb Foam, Creamy Chilled Milk, Bittersweet Coffee Cream",
    pairings: ["snack_churros_cinnamon"],
    dietary: ["Signature Dessert Drink"],
    customizations: {
      serving: ["Iced (Dingin)"]
    }
  },
  {
    id: "sig_choco_loco",
    name: "Choco Loco",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "Creamy Non-Coffee",
    price: 6.00,
    badge: "Rich Chocolate",
    badgeClass: "popular",
    desc: "Cokelat pekat premium ekstra creamy dengan taburan serpihan dark chocolate lezat.",
    image: "assets/products/fudge_brownie.jpg",
    available: true,
    flavorProfile: "Decadent Belgian Cocoa, Thick Milk, Velvety Chocolate Shavings",
    pairings: ["snack_waffle", "breakfast_golden_stack_toast"],
    dietary: ["Non-Coffee"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },
  {
    id: "sig_chai_latte",
    name: "Chai Latte",
    category: "signatures",
    categoryLabel: "Signatures & Refreshers",
    subCategory: "Spiced Tea",
    price: 5.50,
    badge: "Spiced & Warm",
    badgeClass: "popular",
    desc: "Teh hitam rempah aromatik (kapulaga, kayu manis, cengkeh, jahe) dipadu susu lembut.",
    image: "assets/products/caffe_latte.jpg",
    available: true,
    flavorProfile: "Aromatic Cinnamon, Spicy Cardamom & Ginger, Steamed Milk Froth",
    pairings: ["snack_churros_original"],
    dietary: ["Spiced Tea"],
    customizations: {
      serving: ["Hot (Panas)", "Iced (Dingin)"]
    }
  },

  // 8. Matcha Series, Fruit Teas & Basic Beverages
  {
    id: "matcha_classic",
    name: "Classic Matcha",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Matcha Series",
    price: 6.00,
    badge: "Uji Matcha",
    badgeClass: "bestseller",
    desc: "Bubuk matcha hijau autentik dari Uji Jepang, dikocok tradisional dengan susu segar lembut.",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Umami Rich Matcha, Earthy Sweetness, Creamy Microfoam Finish",
    pairings: ["pizza_salmon_mentai", "snack_waffle"],
    upsellHook: "Matcha artisanal murni, sangat serasi dengan Salmon Mentai Pizza.",
    dietary: ["Japanese Green Tea", "Best Seller"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"],
      sweetness: ["Normal (100%)", "Less Sweet (50%)", "No Sugar (0%)"],
      milk: ["Fresh Milk", "Oat Milk (+ $1.00)"]
    }
  },
  {
    id: "matcha_ichigo",
    name: "Matcha Ichigo (Strawberry)",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Matcha Series",
    price: 6.00,
    badge: "Popular Layer",
    badgeClass: "bestseller",
    desc: "Perpaduan tiga layer cantik: selai stroberi buah asli segar, fresh milk, dan layer Uji matcha pekat.",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Sweet Tangy Real Strawberry Compote, Silky Milk, Earthy Green Tea Finish",
    pairings: ["snack_waffle", "pizza_salmon_mentai"],
    upsellHook: "Selain Classic Matcha, kami punya Matcha Ichigo dengan stroberi buah asli!",
    dietary: ["Artisan Layer Drink"],
    customizations: {
      serving: ["Iced (Dingin)"],
      sweetness: ["Normal", "Less Sweet"]
    }
  },
  {
    id: "matcha_mango",
    name: "Matcha Mango",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Matcha Series",
    price: 6.00,
    badge: "Tropical Fusion",
    badgeClass: "popular",
    desc: "Kombinasi unik puree mangga tropis manis harum dengan layer matcha hijau pekat.",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Juicy Sweet Mango, Grassy Matcha Umami, Creamy Layers",
    pairings: ["snack_waffle"],
    dietary: ["Tropical Matcha"],
    customizations: {
      serving: ["Iced (Dingin)"]
    }
  },
  {
    id: "matcha_earl_grey",
    name: "Matcha Earl Grey",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Matcha Series",
    price: 7.00,
    badge: "Premium Fusion",
    badgeClass: "popular",
    desc: "Sensasi perpaduan bergamot aroma khas teh Earl Grey premium dengan seduhan Uji matcha pekat.",
    image: "assets/products/matcha_latte.jpg",
    available: true,
    flavorProfile: "Citrus Bergamot Aroma, Deep Matcha Depth, Elegant Milk Tea Texture",
    pairings: ["snack_churros_cinnamon", "snack_waffle"],
    upsellHook: "Varian matcha premium beraroma Earl Grey yang sangat elegan.",
    dietary: ["Artisan Premium"],
    customizations: {
      serving: ["Iced (Dingin)", "Hot (Panas)"]
    }
  },

  // Fruit Tea Bar ($4.00)
  {
    id: "tea_strawberry",
    name: "Strawberry Tea",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Refreshing Fruit Tea",
    price: 4.00,
    badge: "Fruity",
    badgeClass: "popular",
    desc: "Teh hitam aromatik diseduh dingin dengan potongan buah dan sirup stroberi segar manis.",
    image: "assets/products/iced_tea.jpg",
    available: true,
    flavorProfile: "Sweet Strawberry Notes, Brisk Black Tea, Refreshing Chill",
    pairings: ["pizza_pepperoni", "snack_beef_nachos"],
    upsellHook: "Penyegar buah yang cocok untuk mendampingi makanan berat.",
    dietary: ["Refreshing Fruit Tea"],
    customizations: {
      serving: ["Iced (Dingin)"],
      sweetness: ["Normal", "Less Sweet"]
    }
  },
  {
    id: "tea_peach",
    name: "Peach Tea",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Refreshing Fruit Tea",
    price: 4.00,
    badge: "Fruity",
    badgeClass: "popular",
    desc: "Teh melati wangi dipadu dengan buah persik (peach) manis lembut dan dingin menyegarkan.",
    image: "assets/products/iced_tea.jpg",
    available: true,
    flavorProfile: "Sweet Juicy Peach, Floral Jasmine Aroma, Crisp Ice Finish",
    pairings: ["pizza_creamy_mushroom", "snack_tuna_cheesemelt"],
    dietary: ["Refreshing Fruit Tea"],
    customizations: {
      serving: ["Iced (Dingin)"]
    }
  },
  {
    id: "tea_passionate",
    name: "Passionate Tea (Markisa)",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Refreshing Fruit Tea",
    price: 4.00,
    badge: "Zesty",
    badgeClass: "popular",
    desc: "Teh dingin dengan ekstrak markisa asli yang asam segar membangkitkan dahaga.",
    image: "assets/products/iced_tea.jpg",
    available: true,
    flavorProfile: "Tropical Passion Fruit Tang, Crisp Tea Tannins, Bright Refreshment",
    pairings: ["pizza_hawaiian", "pizza_supermeat"],
    dietary: ["Refreshing Fruit Tea"],
    customizations: {
      serving: ["Iced (Dingin)"]
    }
  },
  {
    id: "tea_lychee",
    name: "Lychee Tea",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Refreshing Fruit Tea",
    price: 4.00,
    badge: "Best Seller",
    badgeClass: "bestseller",
    desc: "Teh dingin favorit bertabur buah leci asli manis dengan aroma floral yang harum memikat.",
    image: "assets/products/iced_tea.jpg",
    available: true,
    flavorProfile: "Sweet Fragrant Lychee, Floral Black Tea, Chilled Icy Sensation",
    pairings: ["pizza_pepperoni", "pizza_honey_garlic", "calzone_tuna_cheese"],
    upsellHook: "Untuk teman makan pizzanya, mau coba Lychee Tea yang segar manis?",
    dietary: ["Best Seller Fruit Tea"],
    customizations: {
      serving: ["Iced (Dingin)"]
    }
  },

  // Basic Beverages
  {
    id: "bev_pot_of_tea",
    name: "Pot of Tea",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Basic & Refreshments",
    price: 4.00,
    badge: "Pot Serving",
    badgeClass: "popular",
    desc: "Satu teko poci teh hangat pilihan (English Breakfast, Earl Grey, Jasmine, Chamomile).",
    image: "assets/products/iced_tea.jpg",
    available: true,
    flavorProfile: "Aromatic Whole Leaf Tea, Soothing Warmth, Calming Herbal Aroma",
    pairings: ["indomee_custom_bar", "snack_waffle"],
    dietary: ["Zero Calorie Option"],
    customizations: {
      teaVariety: ["English Breakfast", "Earl Grey", "Jasmine Green Tea", "Soothing Chamomile"]
    }
  },
  {
    id: "bev_babyccino",
    name: "Babyccino",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Basic & Refreshments",
    price: 4.00,
    badge: "Kids Favorite",
    badgeClass: "popular",
    desc: "Busa susu hangat lembut tanpa kafein dengan taburan bubuk cokelat dan marshmallow mini.",
    image: "assets/products/caffe_latte.jpg",
    available: true,
    flavorProfile: "Warm Frothy Milk, Sweet Cocoa Dust, Fluffy Marshmallow",
    pairings: ["snack_waffle", "snack_churros_original"],
    dietary: ["Kids Friendly", "Caffeine Free"],
    customizations: {
      addons: [
        { name: "Extra Marshmallow", price: 0.50 }
      ]
    }
  },
  {
    id: "bev_mineral_water",
    name: "Mineral Water",
    category: "matcha_tea",
    categoryLabel: "Matcha & Teas",
    subCategory: "Basic & Refreshments",
    price: 1.50,
    badge: "Essential",
    badgeClass: "popular",
    desc: "Air mineral botol dingin murni dan menyegarkan.",
    image: "assets/products/iced_tea.jpg",
    available: true,
    flavorProfile: "Pure Crisp Hydration",
    pairings: ["pizza_margherita", "pizza_pepperoni"],
    dietary: ["Hydration"],
    customizations: {
      temperature: ["Dingin (Chilled)", "Suhu Ruang (Normal)"]
    }
  }
];

// Read existing DB if available to preserve tokens and AI config
let existingDb = {};
if (fs.existsSync(DB_PATH)) {
  try {
    existingDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('Error reading existing db:', e.message);
  }
}

// Preserve existing legacy senopati menu as secondary tenant if exists
const legacyMenu = existingDb.menu && Array.isArray(existingDb.menu) ? existingDb.menu : [];

const multiTenantDb = {
  defaultMerchantId: "coffeenity",
  aiConfig: existingDb.aiConfig || {
    apiKey: "",
    model: "gemini-3.7-flash",
    tone: "warm",
    temperature: 0.7,
    remainingCredits: 50000,
    totalInputTokens: 1500,
    totalOutputTokens: 3000
  },
  merchants: {
    coffeenity: {
      id: "coffeenity",
      name: "The Coffeenity Yard",
      brandUnit: "Doughboy Pizza Kayu Api (@doughboy.pizzakyuapi)",
      tagline: "Cafe, Artisan Filter Coffee, Wood-Fired Pizza, Breakfast & Bites",
      location: "Brunei Darussalam",
      currency: "BND",
      currencySymbol: "$",
      currencyDecimals: 2,
      taxRate: 0.00,
      taxLabel: "Pajak (0%)",
      tablesCount: 12,
      paymentMethods: ["BIBD", "BAIDURI", "POCKET", "CASH"],
      defaultLanguage: "ms-BN",
      categories: [
        { id: "all", name: "Semua" },
        { id: "pizza", name: "Pizza Kayu Api" },
        { id: "calzone_indomee", name: "Calzone & Indomee" },
        { id: "breakfast", name: "Breakfast" },
        { id: "snacks_waffle", name: "Snacks & Waffle" },
        { id: "espresso", name: "Espresso" },
        { id: "filter_coffee", name: "Filter Coffee" },
        { id: "signatures", name: "Signatures" },
        { id: "matcha_tea", name: "Matcha & Tea" }
      ],
      menu: coffeenityMenu,
      orders: [],
      waiterCalls: [],
      auditLogs: [
        {
          timestamp: new Date().toISOString(),
          type: "TENANT_INITIALIZED",
          details: "The Coffeenity Yard (Doughboy Pizza Kayu Api) onboarded as Tenant #1 (Currency: BND $)."
        }
      ],
      stats: {
        grossRevenue: 0.00,
        totalOrdersToday: 0,
        averageTicket: 0.00
      }
    },
    senopati_cafe: {
      id: "senopati_cafe",
      name: "AIODMA Roastery & Kitchen",
      brandUnit: "Senopati Flagship Outlet",
      tagline: "Specialty Artisan Coffee & Gourmet Bistro",
      location: "Jakarta, Indonesia",
      currency: "IDR",
      currencySymbol: "Rp",
      currencyDecimals: 0,
      taxRate: 0.10,
      taxLabel: "Pajak PB1 (10%)",
      tablesCount: 8,
      paymentMethods: ["QRIS", "BCA", "MANDIRI", "CASH"],
      defaultLanguage: "id-ID",
      categories: [
        { id: "all", name: "Semua" },
        { id: "kopi", name: "Kopi" },
        { id: "non-kopi", name: "Non-Kopi" },
        { id: "pizza", name: "Pizza" },
        { id: "makanan", name: "Makanan" },
        { id: "pastry", name: "Pastry" },
        { id: "cemilan", name: "Cemilan" }
      ],
      menu: legacyMenu.length > 0 ? legacyMenu : coffeenityMenu,
      orders: existingDb.orders || [],
      waiterCalls: existingDb.waiterCalls || [],
      auditLogs: existingDb.auditLogs || [],
      stats: existingDb.stats || { grossRevenue: 4820000, totalOrdersToday: 48, averageTicket: 100416 }
    }
  }
};

fs.writeFileSync(DB_PATH, JSON.stringify(multiTenantDb, null, 2), 'utf8');
console.log(`[OK] Successfully wrote multi-tenant database to ${DB_PATH}`);
console.log(`- Active default tenant: ${multiTenantDb.defaultMerchantId}`);
console.log(`- Coffeenity Menu Items count: ${coffeenityMenu.length}`);
console.log(`- Senopati Menu Items count: ${multiTenantDb.merchants.senopati_cafe.menu.length}`);
