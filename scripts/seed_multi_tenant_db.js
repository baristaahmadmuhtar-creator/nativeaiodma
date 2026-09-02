/**
 * Seed Multi-Tenant DB Script for AIODMA Platform
 * Generates data/db.json with:
 * - defaultMerchantId: 'coffeenity'
 * - merchants.coffeenity: The Coffeenity Yard (Brunei Dollar BND $, 62 items, 12 tables)
 * - merchants.senopati_cafe: Senopati Artisan Cafe (Indonesian Rupiah IDR Rp, 36 items, 8 tables)
 * - aiConfig: Gemini 3.7 Flash with 512 thinking budget
 */

const fs = require('fs');
const path = require('path');

const coffeenityMenu = [
  // 1. Wood-Fired Pizza (11)
  {
    id: 'pizza_margherita',
    name: 'Margherita Pizza',
    category: 'pizza',
    price: 10.00,
    badge: 'Classic',
    badgeClass: 'popular',
    desc: 'Fresh mozzarella, fresh basil leaves, rich San Marzano tomato sauce on wood-fired crust.',
    image: 'assets/products/pizza_margherita.jpg',
    available: true,
    flavorProfile: 'Herbaceous Basil, Tangy San Marzano Tomato, Creamy Melted Mozzarella',
    pairings: ['sig_garden_mojito', 'tea_lychee', 'coffee_americano'],
    upsellHook: 'Padukan dengan Garden Mojito dingin untuk sensasi segar khas Italia.',
    dietary: ['Vegetarian', 'Classic'],
    customizations: {
      size: [
        { name: 'Large 12" (Standard)', price: 0 }
      ],
      addons: [
        { name: 'Extra Mozzarella', price: 1.50 },
        { name: 'Garlic Mayo Dip', price: 0.80 }
      ]
    }
  },
  {
    id: 'pizza_creamy_mushroom_chicken',
    name: 'Creamy Mushroom Chicken Pizza',
    category: 'pizza',
    price: 13.00,
    badge: 'Best Seller',
    badgeClass: 'bestseller',
    desc: 'Tender chicken slices, sauteed button mushrooms, rich white cream sauce, mozzarella.',
    image: 'assets/products/pizza_truffle_mushroom.jpg',
    available: true,
    flavorProfile: 'Savory Cream, Earthy Mushrooms, Tender Chicken',
    pairings: ['sig_yard_latte', 'tea_peach'],
    upsellHook: 'Sangat nikmat disandingkan dengan Yard Latte khas The Coffeenity Yard.',
    dietary: ['Best Seller'],
    customizations: {
      size: [
        { name: 'Large 12" (Standard)', price: 0 }
      ],
      addons: [
        { name: 'Extra Mozzarella', price: 1.50 },
        { name: 'Truffle Oil Drizzle', price: 1.20 }
      ]
    }
  },
  {
    id: 'pizza_hawaiian',
    name: 'Hawaiian Pizza',
    category: 'pizza',
    price: 13.00,
    badge: 'Popular',
    badgeClass: 'popular',
    desc: 'Chicken ham, crispy beef bacon bits, juicy pineapple slices, mozzarella, tomato sauce.',
    image: 'assets/products/pizza_bbq_chicken.jpg',
    available: true,
    flavorProfile: 'Sweet Tangy Pineapple, Savory Ham & Bacon, Melted Cheese',
    pairings: ['tea_passionate', 'sig_garden_mojito'],
    upsellHook: 'Cocok dinikmati dengan Passionate Tea asam manis segar.',
    dietary: ['Popular'],
    customizations: {
      size: [
        { name: 'Large 12" (Standard)', price: 0 }
      ],
      addons: [
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },
  {
    id: 'pizza_pepperoni',
    name: 'Pepperoni Pizza',
    category: 'pizza',
    price: 8.00,
    badge: 'Classic',
    badgeClass: 'popular',
    desc: 'Loaded savory beef pepperoni, fresh capsicum, tomato sauce, and golden melted mozzarella.',
    image: 'assets/products/pizza_pepperoni.jpg',
    available: true,
    flavorProfile: 'Crisp Pepperoni, Savory Spice, Golden Mozzarella',
    pairings: ['sig_garden_mojito', 'tea_strawberry', 'coffee_americano'],
    upsellHook: 'Sangat harmonis dengan Garden Mojito dingin bersoda.',
    dietary: ['Classic'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 6.00 }
      ],
      addons: [
        { name: 'Extra Pepperoni', price: 2.00 },
        { name: 'Extra Mozzarella', price: 1.50 },
        { name: 'Garlic Mayo Dip', price: 0.80 }
      ]
    }
  },
  {
    id: 'pizza_honey_garlic_chicken',
    name: 'Honey Garlic Chicken Pizza',
    category: 'pizza',
    price: 8.00,
    badge: 'Special Sauce',
    badgeClass: 'new',
    desc: 'Roast chicken cubes coated in house honey garlic glaze, capsicum, and mozzarella.',
    image: 'assets/products/pizza_bbq_chicken.jpg',
    available: true,
    flavorProfile: 'Sweet Honey Garlic Glaze, Juicy Chicken, Melted Cheese',
    pairings: ['tea_peach', 'coffee_latte'],
    upsellHook: 'Nikmati bersama Sparkling Peach Tea segar.',
    dietary: ['Chef Special'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 6.00 }
      ],
      addons: [
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },
  {
    id: 'pizza_tuna_mayo',
    name: 'Tuna Mayo Pizza',
    category: 'pizza',
    price: 8.00,
    badge: 'Signature',
    badgeClass: 'bestseller',
    desc: 'Savory tuna tossed in creamy special mayo sauce, diced onion, capsicum, mozzarella.',
    image: 'assets/products/pizza_smoked_beef.jpg',
    available: true,
    flavorProfile: 'Rich Tuna Mayo, Sweet Onion, Melty Cheese',
    pairings: ['sig_orange_americano', 'tea_lychee'],
    upsellHook: 'Padukan dengan Orange Americano segar untuk keseimbangan rasa.',
    dietary: ['Signature'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 6.00 }
      ],
      addons: [
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },
  {
    id: 'pizza_bbq_chicken',
    name: 'BBQ Chicken Pizza',
    category: 'pizza',
    price: 8.00,
    badge: 'Favorite',
    badgeClass: 'popular',
    desc: 'Smoky BBQ glazed chicken chunks, sweet caramelized red onions, stretchy mozzarella.',
    image: 'assets/products/pizza_bbq_chicken.jpg',
    available: true,
    flavorProfile: 'Smoky Sweet BBQ, Caramelized Onion, Savory Chicken',
    pairings: ['sig_garden_mojito', 'coffee_americano'],
    upsellHook: 'Pas dipadukan dengan Garden Mojito dingin.',
    dietary: ['Favorite'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 6.00 }
      ],
      addons: [
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },
  {
    id: 'pizza_burger',
    name: 'Burger Pizza',
    category: 'pizza',
    price: 8.00,
    badge: 'Best Seller',
    badgeClass: 'bestseller',
    desc: 'Minced beef patty chunks, classic burger secret sauce, mozzarella, dill pickles, tomato.',
    image: 'assets/products/beef_burger.jpg',
    available: true,
    flavorProfile: 'Juicy Beef Patty, Tangy Dill Pickle, Classic Burger Sauce',
    pairings: ['sig_garden_mojito', 'snack_fries_cheese'],
    upsellHook: 'Lengkapi dengan Fries Cheese renyah dan Garden Mojito.',
    dietary: ['Best Seller'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 6.00 }
      ],
      addons: [
        { name: 'Extra Beef', price: 2.00 },
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },
  {
    id: 'pizza_4_cheese',
    name: '4 Cheese Pizza (Quattro Formaggi)',
    category: 'pizza',
    price: 9.00,
    badge: 'Cheesy',
    badgeClass: 'popular',
    desc: 'Tomato base loaded with 4 artisanal cheeses: Mozzarella, Cheddar, Ricotta, Parmesan.',
    image: 'assets/products/pizza_quattro_formaggi.jpg',
    available: true,
    flavorProfile: 'Rich 4-Cheese Blend, Savory Umami, Golden Crust',
    pairings: ['coffee_v60', 'sig_brulee_latte'],
    upsellHook: 'Sangat harmonis dengan Brulee Latte manis lembut.',
    dietary: ['Vegetarian', 'Cheese Lovers'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 7.00 }
      ],
      addons: [
        { name: 'Garlic Mayo Dip', price: 0.80 }
      ]
    }
  },
  {
    id: 'pizza_supermeat',
    name: 'Supermeat Pizza',
    category: 'pizza',
    price: 9.00,
    badge: 'Meat Lovers',
    badgeClass: 'bestseller',
    desc: 'Ground seasoned beef, chicken ham slices, crispy bacon, capsicum, tomato sauce base.',
    image: 'assets/products/pizza_pepperoni.jpg',
    available: true,
    flavorProfile: 'Loaded Trio Meats, Bold Tomato Umami, Melted Mozzarella',
    pairings: ['sig_garden_mojito', 'coffee_americano'],
    upsellHook: 'Sempurna dengan Iced Americano yang bersih dan menyegarkan.',
    dietary: ['Meat Lovers'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 7.00 }
      ],
      addons: [
        { name: 'Extra Meat', price: 2.50 },
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },
  {
    id: 'pizza_salmon_mentai',
    name: 'Salmon Mentai Pizza',
    category: 'pizza',
    price: 9.00,
    badge: 'Best Seller',
    badgeClass: 'bestseller',
    desc: 'Creamy mentai mayo glaze, smoked salmon slices, roasted seaweed flakes, fresh basil.',
    image: 'assets/products/pizza_smoked_beef.jpg',
    available: true,
    flavorProfile: 'Smoky Salmon, Creamy Savory Mentai, Aromatic Nori',
    pairings: ['tea_matcha_ichigo', 'sig_orange_americano'],
    upsellHook: 'Padukan dengan Matcha Ichigo artisanal dingin.',
    dietary: ['Signature', 'Best Seller'],
    customizations: {
      size: [
        { name: 'Regular 9"', price: 0 },
        { name: 'Large 12"', price: 7.00 }
      ],
      addons: [
        { name: 'Extra Salmon', price: 3.00 },
        { name: 'Extra Mozzarella', price: 1.50 }
      ]
    }
  },

  // 2. Calzone & Indomee Custom Bar (3)
  {
    id: 'calzone_tuna_cheese',
    name: 'Tuna Cheese Calzone',
    category: 'calzone',
    price: 6.00,
    badge: 'Baked Fresh',
    badgeClass: 'popular',
    desc: 'Folded Italian pizza pocket packed with seasoned tuna chunks, herbs, and melted cheese.',
    image: 'assets/products/pizza_smoked_beef.jpg',
    available: true,
    flavorProfile: 'Flaky Golden Dough, Warm Tuna Melt, Savory Herbs',
    pairings: ['tea_peach', 'coffee_latte'],
    upsellHook: 'Nikmati selagi hangat bersama Sparkling Peach Tea.',
    dietary: ['Seafood'],
    customizations: {
      addons: [
        { name: 'Extra Cheese Melt', price: 1.00 }
      ]
    }
  },
  {
    id: 'calzone_meatlover',
    name: 'Meatlover Calzone',
    category: 'calzone',
    price: 6.00,
    badge: 'Hearty',
    badgeClass: 'bestseller',
    desc: 'Folded golden pocket filled with seasoned minced beef, pepperoni, sausage, and mozzarella.',
    image: 'assets/products/pizza_margherita.jpg',
    available: true,
    flavorProfile: 'Rich Meats, Melted Mozzarella, Warm Flaky Crust',
    pairings: ['coffee_americano', 'sig_garden_mojito'],
    upsellHook: 'Padukan dengan Garden Mojito dingin bersoda.',
    dietary: ['Meat Lovers'],
    customizations: {
      addons: [
        { name: 'Extra Mozzarella', price: 1.00 }
      ]
    }
  },
  {
    id: 'indomee_custom_bar',
    name: 'Indomee Custom Bar',
    category: 'indomee',
    price: 2.00,
    badge: 'Custom Bar',
    badgeClass: 'new',
    desc: 'Classic Indomee goreng tossed with aromatic shallot oil, customizable with fresh toppings.',
    image: 'assets/products/nasi_goreng.jpg',
    available: true,
    flavorProfile: 'Savory Umami Noodles, Fried Shallot Aroma, Custom Addons',
    pairings: ['tea_strawberry', 'sig_garden_mojito'],
    upsellHook: 'Tambah topping Telur (+ $1.00) dan Kerang (+ $2.00) untuk porsi komplit.',
    dietary: ['Comfort Food'],
    customizations: {
      addons: [
        { name: '+Egg (Telur Mata Sapi)', price: 1.00 },
        { name: '+Baby Clam (Kerang)', price: 2.00 }
      ]
    }
  },

  // 3. Breakfast Plates & Specialties (5)
  {
    id: 'bf_bigboy_breakfast',
    name: 'Bigboy Breakfast Plate',
    category: 'breakfast',
    price: 12.50,
    badge: 'Chef Choice',
    badgeClass: 'bestseller',
    desc: 'Loaded artisan platter: toasted sourdough, beef salami, grilled sausage, fluffy omelette, sauteed garlic mushrooms, baked beans, and blistered cherry tomatoes.',
    image: 'assets/products/chicken_rice_bowl.jpg',
    available: true,
    flavorProfile: 'Hearty Savory Meats, Fluffy Eggs, Garlic Mushrooms, Toasted Bread',
    pairings: ['coffee_house_signature_latte', 'coffee_flat_white'],
    upsellHook: 'Pas dipadukan dengan House Signature Latte panas.',
    dietary: ['Hearty Breakfast', 'Best Seller'],
    customizations: {
      eggStyle: ['Fluffy Omelette', 'Sunny Side Up', 'Scrambled Eggs'],
      addons: [
        { name: 'Extra Sourdough Toast', price: 1.50 },
        { name: 'Extra Sausage', price: 2.00 }
      ]
    }
  },
  {
    id: 'bf_classic_rise',
    name: 'Classic Rise Breakfast',
    category: 'breakfast',
    price: 9.50,
    badge: 'Classic',
    badgeClass: 'popular',
    desc: 'Two sunny eggs, Heinz baked beans, grilled herb tomatoes, breakfast sausage, and golden toasted bread.',
    image: 'assets/products/nasi_goreng.jpg',
    available: true,
    flavorProfile: 'Classic Sunny Eggs, Savory Sausage, Warm Beans & Toast',
    pairings: ['coffee_americano', 'coffee_cappuccino'],
    upsellHook: 'Cocok dengan segelas Americano segar di pagi hari.',
    dietary: ['Classic Breakfast'],
    customizations: {
      addons: [
        { name: 'Extra Sausage', price: 2.00 }
      ]
    }
  },
  {
    id: 'bf_egg_and_dip',
    name: 'Egg and Dip',
    category: 'breakfast',
    price: 7.50,
    badge: 'Signature',
    badgeClass: 'new',
    desc: 'Crispy butter toasted bread paired with velvety fluffy milk omelette sprinkled with savory tobiko.',
    image: 'assets/products/butter_croissant.jpg',
    available: true,
    flavorProfile: 'Velvety Milk Eggs, Popping Savory Tobiko, Crunchy Toast',
    pairings: ['coffee_latte', 'tea_matcha_classic'],
    upsellHook: 'Lengkapi dengan Latte hangat lembut berseni latte art.',
    dietary: ['Chef Signature'],
    customizations: {
      addons: [
        { name: 'Extra Toast Bread', price: 1.50 }
      ]
    }
  },
  {
    id: 'bf_french_toast',
    name: 'Golden Stack French Toast',
    category: 'breakfast',
    price: 6.50,
    badge: 'Sweet Breakfast',
    badgeClass: 'popular',
    desc: 'Thick egg-dipped brioche toasted to golden perfection, drenched in melted butter and maple syrup.',
    image: 'assets/products/almond_croissant.jpg',
    available: true,
    flavorProfile: 'Rich Golden Brioche, Creamy Butter, Maple Sweetness',
    pairings: ['coffee_americano', 'coffee_flat_white'],
    upsellHook: 'Paduan manis gurih paling nikmat bersama Iced Americano.',
    dietary: ['Vegetarian', 'Sweet Tooth'],
    customizations: {
      addons: [
        { name: 'Vanilla Ice Cream Scoop', price: 1.50 }
      ]
    }
  },
  {
    id: 'bf_sunny_pan_pizza',
    name: 'The Sunny-Pan Pizza',
    category: 'breakfast',
    price: 8.00,
    badge: 'Unique Wrap',
    badgeClass: 'bestseller',
    desc: 'Crispy prata wrap filled with runny sunny-side-up eggs, beef pepperoni slices, and black olives.',
    image: 'assets/products/pizza_margherita.jpg',
    available: true,
    flavorProfile: 'Flaky Prata Crust, Runny Egg Yolk, Savory Pepperoni & Olives',
    pairings: ['coffee_spanish_latte', 'tea_peach'],
    upsellHook: 'Sangat nikmat disandingkan dengan Spanish Latte dingin.',
    dietary: ['All-Day Breakfast'],
    customizations: {
      addons: [
        { name: 'Extra Mozzarella', price: 1.00 }
      ]
    }
  },

  // 4. Snacks, Sides, Churros & Waffle (8)
  {
    id: 'snack_beef_nachos',
    name: 'Beef Nachos',
    category: 'snacks',
    price: 5.00,
    badge: 'Sharing',
    badgeClass: 'popular',
    desc: 'Crispy tortilla chips piled high with seasoned minced beef, warm melted cheese sauce, and salsa.',
    image: 'assets/products/truffle_fries.jpg',
    available: true,
    flavorProfile: 'Crunchy Corn Chips, Cheesy Melt, Savory Minced Beef',
    pairings: ['sig_garden_mojito', 'tea_passionate'],
    upsellHook: 'Camilan pas untuk dinikmati bersama Garden Mojito.',
    dietary: ['Sharing Snack']
  },
  {
    id: 'snack_sandwich',
    name: 'Artisan Sandwich (Egg / Tuna)',
    category: 'snacks',
    price: 3.50,
    badge: 'Fresh Daily',
    badgeClass: 'popular',
    desc: 'Toasted artisan sandwich with your choice of savory filling: Fresh Egg Salad or Seasoned Tuna Mayo.',
    image: 'assets/products/beef_burger.jpg',
    available: true,
    flavorProfile: 'Crisp Toasted Bread, Creamy Egg Salad or Zesty Tuna Mayo',
    pairings: ['coffee_latte', 'tea_lychee'],
    upsellHook: 'Tentukan isian: Egg Salad atau Tuna Mayo favorit Anda.',
    dietary: ['Quick Bite'],
    customizations: {
      filling: ['Egg Salad', 'Tuna Mayo']
    }
  },
  {
    id: 'snack_spinach_cheese_dip',
    name: 'Spinach Cheese Dip',
    category: 'snacks',
    price: 7.00,
    badge: 'Warm Dip',
    badgeClass: 'new',
    desc: 'Creamy baked spinach dip with rich melted cheeses, served bubbling hot with toasted garlic crisps.',
    image: 'assets/products/burnt_cheesecake.jpg',
    available: true,
    flavorProfile: 'Creamy Spinach, Golden Melted Cheese, Garlic Crisps',
    pairings: ['coffee_chemex', 'tea_peach'],
    dietary: ['Vegetarian', 'Cheesy Dip']
  },
  {
    id: 'snack_tuna_cheesemelt',
    name: 'Tuna Cheesemelt',
    category: 'snacks',
    price: 3.80,
    badge: 'Melted',
    badgeClass: 'popular',
    desc: 'Open-faced toasted sourdough topped with seasoned tuna mayo and a thick blanket of grilled cheddar mozzarella.',
    image: 'assets/products/butter_croissant.jpg',
    available: true,
    flavorProfile: 'Warm Melted Cheddar, Creamy Tuna, Crispy Sourdough',
    pairings: ['coffee_americano', 'tea_strawberry'],
    dietary: ['Seafood']
  },
  {
    id: 'snack_fries',
    name: 'Gourmet Fries (Original / Cheese)',
    category: 'snacks',
    price: 3.00,
    badge: 'Classic Snack',
    badgeClass: 'popular',
    desc: 'Golden crispy shoestring potatoes served fresh and hot. Choose Original salted or Loaded Cheese sauce.',
    image: 'assets/products/truffle_fries.jpg',
    available: true,
    flavorProfile: 'Crispy Exterior, Fluffy Potato, Savory Seasoning',
    pairings: ['pizza_burger', 'sig_garden_mojito'],
    upsellHook: 'Pilihan rasa: Original Crispy atau Loaded Cheese.',
    dietary: ['Vegetarian'],
    customizations: {
      flavor: ['Original Salted', 'Loaded Cheese Melt (+$0.50)']
    }
  },
  {
    id: 'snack_churros_original',
    name: 'Churros Original',
    category: 'snacks',
    price: 2.50,
    badge: 'Warm Dip',
    badgeClass: 'popular',
    desc: 'Crispy fried Spanish churros dusted in powdered sugar, served with warm premium dark chocolate dip.',
    image: 'assets/products/cinnamon_churros.jpg',
    available: true,
    flavorProfile: 'Crispy Fluted Pastry, Powdered Sugar, Rich Warm Chocolate Dip',
    pairings: ['coffee_americano', 'coffee_latte'],
    upsellHook: 'Sangat nikmat dinikmati selagi hangat dicelup saus cokelat.',
    dietary: ['Vegetarian', 'Sweet Bite']
  },
  {
    id: 'snack_churros_cinnamon',
    name: 'Churros Cinnamon',
    category: 'snacks',
    price: 3.00,
    badge: 'Aromatic',
    badgeClass: 'bestseller',
    desc: 'Golden churros generously rolled in fragrant cinnamon brown sugar, served with warm dark chocolate sauce.',
    image: 'assets/products/cinnamon_churros.jpg',
    available: true,
    flavorProfile: 'Fragrant Cinnamon Spice, Brown Sugar Crunch, Warm Dark Chocolate',
    pairings: ['coffee_cappuccino', 'coffee_house_signature_latte'],
    upsellHook: 'Pas dipadukan dengan Artisan Cappuccino hangat.',
    dietary: ['Vegetarian', 'Best Seller']
  },
  {
    id: 'snack_waffle',
    name: 'Classic Belgian Waffle',
    category: 'snacks',
    price: 2.50,
    badge: 'Choose Spread',
    badgeClass: 'popular',
    desc: 'Freshly baked Belgian waffle with deep pockets, crisp on the outside and fluffy inside. Includes 1 spread.',
    image: 'assets/products/almond_croissant.jpg',
    available: true,
    flavorProfile: 'Crisp Golden Grid, Fluffy Interior, Sweet Rich Spread',
    pairings: ['coffee_flat_white', 'coffee_americano'],
    upsellHook: 'Wajib pilih 1 spread favorit: Kaya, Peanut Butter, Chocolate, atau Planta.',
    dietary: ['Vegetarian'],
    customizations: {
      spread: ['Pandan Kaya', 'Creamy Peanut Butter', 'Rich Chocolate', 'Aromatic Planta Butter']
    }
  },

  // 5. Espresso-Based Coffee (8)
  {
    id: 'coffee_americano',
    name: 'Americano',
    category: 'espresso',
    price: 3.50,
    badge: 'Clean & Bold',
    badgeClass: 'popular',
    desc: 'Double shot of house specialty espresso diluted with filtered hot or iced water for a clean, rich cup.',
    image: 'assets/products/americano.jpg',
    available: true,
    flavorProfile: 'Clean Arabica, Roasted Nuts, Subtle Dark Cocoa',
    pairings: ['pizza_pepperoni', 'bf_french_toast', 'snack_churros_cinnamon'],
    upsellHook: 'Tersedia varian Hot ($3.50) atau Iced ($4.00).',
    dietary: ['Vegan', 'Zero Sugar'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ],
      addons: [
        { name: 'Extra Espresso Shot', price: 1.00 },
        { name: 'Oat Milk Sub', price: 1.00 }
      ]
    }
  },
  {
    id: 'coffee_latte',
    name: 'Caffe Latte',
    category: 'espresso',
    price: 5.00,
    badge: 'Smooth Milk',
    badgeClass: 'popular',
    desc: 'Rich specialty espresso blended with silky steamed fresh milk and a light microfoam crown.',
    image: 'assets/products/hot_latte.jpg',
    available: true,
    flavorProfile: 'Smooth Arabica, Creamy Dairy, Sweet Natural Milk Finish',
    pairings: ['bf_bigboy_breakfast', 'snack_waffle'],
    upsellHook: 'Tersedia varian Hot ($5.00) atau Iced ($5.50).',
    dietary: ['Classic Coffee'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ],
      addons: [
        { name: 'Oat Milk Sub', price: 1.00 },
        { name: 'Extra Espresso Shot', price: 1.00 }
      ]
    }
  },
  {
    id: 'coffee_flat_white',
    name: 'Flat White',
    category: 'espresso',
    price: 5.00,
    badge: 'Barista Choice',
    badgeClass: 'popular',
    desc: 'Double ristretto shot with velvety thin microfoam steamed milk, strong coffee body and velvety texture.',
    image: 'assets/products/hot_latte.jpg',
    available: true,
    flavorProfile: 'Bold Ristretto Punch, Microfoam Velvety Texture',
    pairings: ['bf_classic_rise', 'snack_churros_original'],
    dietary: ['Barista Choice'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ]
    }
  },
  {
    id: 'coffee_cappuccino',
    name: 'Artisan Cappuccino',
    category: 'espresso',
    price: 5.00,
    badge: 'Thick Foam',
    badgeClass: 'popular',
    desc: 'Equal parts espresso, steamed milk, and a thick airy foam cap dusted with pure dark cocoa powder.',
    image: 'assets/products/cappuccino.jpg',
    available: true,
    flavorProfile: 'Dense Cocoa Foam, Bold Arabica Body, Balanced Dairy',
    pairings: ['snack_churros_cinnamon', 'bf_french_toast'],
    dietary: ['Classic Coffee'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ]
    }
  },
  {
    id: 'coffee_mocha',
    name: 'Caffe Mocha',
    category: 'espresso',
    price: 5.00,
    badge: 'Rich Choco',
    badgeClass: 'bestseller',
    desc: 'Single origin espresso folded with Belgian dark chocolate ganache and fresh steamed milk.',
    image: 'assets/products/mocha.jpg',
    available: true,
    flavorProfile: 'Bittersweet Dark Chocolate, Bold Espresso, Creamy Finish',
    pairings: ['snack_waffle', 'snack_churros_original'],
    dietary: ['Sweet Coffee'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ]
    }
  },
  {
    id: 'coffee_flavored_latte',
    name: 'Flavored Latte (Vanilla / Caramel / Hazelnut)',
    category: 'espresso',
    price: 5.00,
    badge: 'Aromatic Syrups',
    badgeClass: 'popular',
    desc: 'Smooth espresso and fresh milk infused with your choice of premium French syrup.',
    image: 'assets/products/caramel_macchiato.jpg',
    available: true,
    flavorProfile: 'Aromatic Vanilla, Buttery Caramel, or Roasted Hazelnut with Creamy Espresso',
    pairings: ['snack_waffle', 'bf_french_toast'],
    dietary: ['Sweet Coffee'],
    customizations: {
      flavor: ['Madagascar Vanilla', 'Salted Butter Caramel', 'Roasted Hazelnut'],
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ]
    }
  },
  {
    id: 'coffee_spanish_latte',
    name: 'Spanish Latte',
    category: 'espresso',
    price: 5.50,
    badge: 'Sweet & Creamy',
    badgeClass: 'bestseller',
    desc: 'Bold espresso paired with fresh milk and sweet condensed milk for a rich, silky texture.',
    image: 'assets/products/kopi_milk_aren.jpg',
    available: true,
    flavorProfile: 'Silky Sweet Milk, Deep Arabica Punch, Velvety Mouthfeel',
    pairings: ['pizza_salmon_mentai', 'bf_sunny_pan_pizza'],
    upsellHook: 'Sangat nikmat disajikan dingin (Iced $6.00).',
    dietary: ['Best Seller'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ]
    }
  },
  {
    id: 'coffee_house_signature_latte',
    name: 'House Signature Latte',
    category: 'espresso',
    price: 5.50,
    badge: 'Yard Recipe',
    badgeClass: 'bestseller',
    desc: 'The Coffeenity Yard proprietary secret blend espresso with artisanal infused cream.',
    image: 'assets/products/hot_latte.jpg',
    available: true,
    flavorProfile: 'Toasted Caramel, Brown Sugar, Velvety Cream, Smooth Arabica',
    pairings: ['bf_bigboy_breakfast', 'pizza_burger'],
    dietary: ['Signature'],
    customizations: {
      temperature: [
        { name: 'Hot', price: 0 },
        { name: 'Iced', price: 0.50 }
      ]
    }
  },

  // 6. Filter Coffee (Manual Brew Bar) (5)
  {
    id: 'filter_v60',
    name: 'V60 Pour Over',
    category: 'filter',
    price: 5.00,
    badge: 'Clean Cup',
    badgeClass: 'popular',
    desc: 'Precision cone pour-over highlighting delicate floral, citrus, and sweet origin notes.',
    image: 'assets/products/espresso_single.jpg',
    available: true,
    flavorProfile: 'Crisp Acidity, Jasmine Floral, Delicate Fruit Sweetness, Tea-like Body',
    pairings: ['snack_waffle', 'bf_classic_rise'],
    dietary: ['Single Origin', 'Manual Brew']
  },
  {
    id: 'filter_japanese_drip',
    name: 'Japanese Iced Drip',
    category: 'filter',
    price: 5.50,
    badge: 'Iced Filter',
    badgeClass: 'bestseller',
    desc: 'Flash-brewed pour over dripping directly over crystal ice cubes, locking in vibrant fruit aromatics.',
    image: 'assets/products/americano.jpg',
    available: true,
    flavorProfile: 'Vibrant Bright Acidity, Chilled Berry Aromatics, Sparkling Refreshment',
    pairings: ['pizza_margherita', 'snack_sandwich'],
    dietary: ['Manual Brew', 'Iced']
  },
  {
    id: 'filter_vietnam_drip',
    name: 'Vietnam Drip (Ca Phe)',
    category: 'filter',
    price: 5.00,
    badge: 'Bold & Sweet',
    badgeClass: 'popular',
    desc: 'Traditional slow gravity phin drip using dark roast coffee layered over sweetened condensed milk.',
    image: 'assets/products/iced_latte.jpg',
    available: true,
    flavorProfile: 'Heavy Dark Roast Cocoa, Sweet Creamy Milk, Intense Body',
    pairings: ['snack_churros_original', 'snack_waffle'],
    dietary: ['Traditional Brew']
  },
  {
    id: 'filter_aeropress',
    name: 'AeroPress Brew',
    category: 'filter',
    price: 5.00,
    badge: 'Rich Body',
    badgeClass: 'popular',
    desc: 'Air pressure immersion extraction delivering maximum sweetness, thick mouthfeel, and low bitterness.',
    image: 'assets/products/espresso_single.jpg',
    available: true,
    flavorProfile: 'Full Round Body, Sweet Chocolate Undertones, Low Acidity',
    pairings: ['bf_bigboy_breakfast', 'pizza_pepperoni'],
    dietary: ['Manual Brew']
  },
  {
    id: 'filter_chemex',
    name: 'Chemex Artisan Brew',
    category: 'filter',
    price: 6.00,
    badge: 'Ultra Smooth',
    badgeClass: 'popular',
    desc: 'Thick bond paper filtration removing all sediment and oils for the smoothest, cleanest coffee possible.',
    image: 'assets/products/americano.jpg',
    available: true,
    flavorProfile: 'Ultra Smooth, Pure Flavor Clarity, Sweet Clean Finish',
    pairings: ['snack_spinach_cheese_dip', 'snack_sandwich'],
    dietary: ['Manual Brew']
  },

  // 7. Signature Specialty Drinks & Refresher (11)
  {
    id: 'sig_yard_latte',
    name: 'Yard Latte',
    category: 'specialty',
    price: 6.00,
    badge: 'House Signature',
    badgeClass: 'bestseller',
    desc: 'Our iconic house specialty latte crafted with slow-infused palm cream and double ristretto.',
    image: 'assets/products/kopi_milk_aren.jpg',
    available: true,
    flavorProfile: 'Creamy Artisanal Palm Sugar, Rich Espresso, Velvety Texture',
    pairings: ['pizza_creamy_mushroom_chicken', 'bf_bigboy_breakfast'],
    dietary: ['House Signature', 'Best Seller']
  },
  {
    id: 'sig_brulee_latte',
    name: 'Brulee Latte',
    category: 'specialty',
    price: 6.00,
    badge: 'Caramelized Top',
    badgeClass: 'bestseller',
    desc: 'Velvety latte topped with a torched caramelized sugar crust crackling at first sip.',
    image: 'assets/products/caramel_macchiato.jpg',
    available: true,
    flavorProfile: 'Crispy Caramel Crust, French Vanilla Custard, Bold Espresso',
    pairings: ['pizza_4_cheese', 'snack_waffle'],
    dietary: ['Signature']
  },
  {
    id: 'sig_honey_bee_latte',
    name: 'Honey Bee Latte',
    category: 'specialty',
    price: 6.00,
    badge: 'Natural Honey',
    badgeClass: 'popular',
    desc: 'Pure forest wildflower honey drizzled into smooth steamed oat milk and espresso.',
    image: 'assets/products/hot_latte.jpg',
    available: true,
    flavorProfile: 'Wildflower Honey Sweetness, Smooth Milk, Warm Arabica',
    pairings: ['bf_french_toast', 'snack_waffle'],
    dietary: ['Natural Honey']
  },
  {
    id: 'sig_orange_americano',
    name: 'Orange Americano',
    category: 'specialty',
    price: 5.00,
    badge: 'Citrus Boost',
    badgeClass: 'bestseller',
    desc: 'Freshly squeezed sweet Valencia orange juice crowned with a floating double espresso shot.',
    image: 'assets/products/peach_tea.jpg',
    available: true,
    flavorProfile: 'Zesty Citrus Tang, Sweet Orange, Bold Espresso Contrast',
    pairings: ['pizza_tuna_mayo', 'pizza_salmon_mentai'],
    dietary: ['Refreshing Citrus', 'Best Seller']
  },
  {
    id: 'sig_dirty_taro',
    name: 'Dirty Taro',
    category: 'specialty',
    price: 6.00,
    badge: 'Unique Fusion',
    badgeClass: 'new',
    desc: 'Velvety purple taro cream poured with an intense dark espresso shot layered on top.',
    image: 'assets/products/taro_milk.jpg',
    available: true,
    flavorProfile: 'Sweet Earthy Taro, Creamy Dairy, Bitter Espresso Contrast',
    pairings: ['snack_churros_cinnamon'],
    dietary: ['Signature Fusion']
  },
  {
    id: 'sig_garden_mojito',
    name: 'Garden Mojito (Virgin)',
    category: 'specialty',
    price: 5.00,
    badge: 'Super Fresh',
    badgeClass: 'bestseller',
    desc: 'Muddled fresh garden mint, zesty lime wedges, sparkling soda water, and cane sweetness.',
    image: 'assets/products/berry_lemonade.jpg',
    available: true,
    flavorProfile: 'Sparkling Lime, Crisp Fresh Mint, Icy Refreshment',
    pairings: ['pizza_pepperoni', 'pizza_burger', 'pizza_supermeat', 'snack_beef_nachos'],
    upsellHook: 'Penyegar nomor satu untuk disandingkan dengan Pizza Kayu Api gurih.',
    dietary: ['Non-Coffee', 'Vegan', 'Best Seller']
  },
  {
    id: 'sig_ube_taro',
    name: 'Ube Taro Cream',
    category: 'specialty',
    price: 5.00,
    badge: 'Creamy Purple',
    badgeClass: 'popular',
    desc: 'Smooth Philippine ube and purple taro blend infused with creamy fresh milk.',
    image: 'assets/products/taro_milk.jpg',
    available: true,
    flavorProfile: 'Sweet Nutty Ube, Rich Taro Cream, Velvety Finish',
    pairings: ['snack_waffle', 'snack_churros_original'],
    dietary: ['Non-Coffee']
  },
  {
    id: 'sig_bali_taro',
    name: 'Bali Taro Tropical',
    category: 'specialty',
    price: 5.00,
    badge: 'Tropical Blend',
    badgeClass: 'popular',
    desc: 'Tropical coconut cream and aromatic taro blend with a hint of roasted pandan.',
    image: 'assets/products/mango_smoothie.jpg',
    available: true,
    flavorProfile: 'Roasted Pandan, Sweet Taro, Creamy Coconut Milk',
    pairings: ['snack_waffle'],
    dietary: ['Non-Coffee']
  },
  {
    id: 'sig_dalgona_saruaso',
    name: 'Dalgona Saruaso',
    category: 'specialty',
    price: 6.00,
    badge: 'Whipped Foam',
    badgeClass: 'popular',
    desc: 'Whipped golden coffee meringue cloud sitting atop chilled fresh vanilla milk.',
    image: 'assets/products/caramel_macchiato.jpg',
    available: true,
    flavorProfile: 'Bittersweet Whipped Coffee Meringue, Chilled Sweet Milk',
    pairings: ['snack_churros_cinnamon'],
    dietary: ['Signature']
  },
  {
    id: 'sig_choco_loco',
    name: 'Choco Loco Premium',
    category: 'specialty',
    price: 6.00,
    badge: 'Dark Ganache',
    badgeClass: 'bestseller',
    desc: 'Extra rich melted Belgian dark chocolate ganache blended with creamy fresh milk.',
    image: 'assets/products/chocolate_fudge.jpg',
    available: true,
    flavorProfile: 'Intense Dark Cocoa Ganache, Creamy Milk, Silky Chocolate Drizzle',
    pairings: ['snack_waffle', 'bf_french_toast'],
    dietary: ['Non-Coffee', 'Best Seller']
  },
  {
    id: 'sig_chai_latte',
    name: 'Spiced Chai Latte',
    category: 'specialty',
    price: 5.50,
    badge: 'Aromatic Spices',
    badgeClass: 'popular',
    desc: 'Steeped black tea infused with cardamom, cinnamon, clove, ginger, and steamed milk.',
    image: 'assets/products/hot_latte.jpg',
    available: true,
    flavorProfile: 'Warm Warming Spices, Sweet Cinnamon & Cardamom, Silky Milk',
    pairings: ['snack_churros_cinnamon', 'bf_french_toast'],
    dietary: ['Spiced Tea']
  },

  // 8. Matcha Series, Fruit Teas & Basic Beverages (11)
  {
    id: 'tea_matcha_classic',
    name: 'Classic Kyoto Matcha Latte',
    category: 'matcha',
    price: 6.00,
    badge: 'Ceremonial Grade',
    badgeClass: 'bestseller',
    desc: 'Pure Japanese Uji ceremonial green tea whisked traditionally with fresh milk.',
    image: 'assets/products/matcha_latte.jpg',
    available: true,
    flavorProfile: 'Earthy Umami Green Tea, Smooth Microfoam, Sweet Milk Finish',
    pairings: ['snack_waffle', 'bf_french_toast'],
    dietary: ['Ceremonial Matcha', 'Best Seller']
  },
  {
    id: 'tea_matcha_ichigo',
    name: 'Matcha Ichigo (Strawberry)',
    category: 'matcha',
    price: 6.00,
    badge: 'Layered',
    badgeClass: 'bestseller',
    desc: 'Three layered beauty: artisan strawberry fruit compote, fresh milk, and rich green matcha.',
    image: 'assets/products/matcha_latte.jpg',
    available: true,
    flavorProfile: 'Sweet Tart Strawberry, Creamy Milk, Earthy Green Tea Contrast',
    pairings: ['pizza_salmon_mentai', 'snack_waffle'],
    dietary: ['Signature Matcha', 'Best Seller']
  },
  {
    id: 'tea_matcha_mango',
    name: 'Matcha Mango Tropical',
    category: 'matcha',
    price: 6.00,
    badge: 'Tropical',
    badgeClass: 'popular',
    desc: 'Sweet ripe mango puree layered with fresh dairy milk and bold Kyoto matcha.',
    image: 'assets/products/mango_smoothie.jpg',
    available: true,
    flavorProfile: 'Sweet Tropical Mango, Rich Cream, Earthy Matcha Umami',
    pairings: ['snack_sandwich'],
    dietary: ['Artisan Matcha']
  },
  {
    id: 'tea_matcha_earl_grey',
    name: 'Matcha Earl Grey Fusion',
    category: 'matcha',
    price: 7.00,
    badge: 'Double Tea',
    badgeClass: 'new',
    desc: 'Fragrant bergamot Earl Grey tea infused harmoniously with premium Japanese ceremonial matcha.',
    image: 'assets/products/matcha_latte.jpg',
    available: true,
    flavorProfile: 'Citrus Bergamot Aroma, Earthy Green Matcha, Silky Texture',
    pairings: ['bf_egg_and_dip', 'snack_waffle'],
    dietary: ['Special Fusion']
  },
  {
    id: 'tea_strawberry',
    name: 'Sparkling Strawberry Fruit Tea',
    category: 'tea',
    price: 4.00,
    badge: 'Fresh Fruit',
    badgeClass: 'popular',
    desc: 'Brewed jasmine green tea shaken with real crushed strawberries and crystal ice.',
    image: 'assets/products/berry_lemonade.jpg',
    available: true,
    flavorProfile: 'Fragrant Jasmine, Sweet Strawberry Chunks, Icy Refreshment',
    pairings: ['pizza_pepperoni', 'indomee_custom_bar'],
    dietary: ['Fruit Tea', 'Vegan']
  },
  {
    id: 'tea_peach',
    name: 'Sparkling Peach Tea',
    category: 'tea',
    price: 4.00,
    badge: 'Most Popular',
    badgeClass: 'bestseller',
    desc: 'Chilled Ceylon tea infused with juicy peach nectar, real peach slices, and fresh mint.',
    image: 'assets/products/peach_tea.jpg',
    available: true,
    flavorProfile: 'Juicy Yellow Peach, Crisp Black Tea, Cooling Mint Finish',
    pairings: ['pizza_creamy_mushroom_chicken', 'calzone_tuna_cheese'],
    dietary: ['Fruit Tea', 'Best Seller']
  },
  {
    id: 'tea_passionate',
    name: 'Passionate Fruit Tea (Markisa)',
    category: 'tea',
    price: 4.00,
    badge: 'Tangy Passion',
    badgeClass: 'popular',
    desc: 'Tangy passion fruit pulp and crunchy seeds shaken with ice-cold premium black tea.',
    image: 'assets/products/peach_tea.jpg',
    available: true,
    flavorProfile: 'Tropical Tangy Passionfruit, Crisp Black Tea, Sweet Zing',
    pairings: ['pizza_hawaiian', 'snack_beef_nachos'],
    dietary: ['Fruit Tea', 'Vegan']
  },
  {
    id: 'tea_lychee',
    name: 'Lychee Iced Tea',
    category: 'tea',
    price: 4.00,
    badge: 'Sweet Floral',
    badgeClass: 'popular',
    desc: 'Fragrant brewed black tea sweetened with real lychee fruit juice and whole peeled lychees.',
    image: 'assets/products/peach_tea.jpg',
    available: true,
    flavorProfile: 'Sweet Floral Lychee, Whole Plump Lychees, Refreshing Iced Tea',
    pairings: ['pizza_margherita', 'pizza_tuna_mayo'],
    dietary: ['Fruit Tea', 'Vegan']
  },
  {
    id: 'bev_pot_of_tea',
    name: 'Pot of Artisan Hot Tea',
    category: 'tea',
    price: 4.00,
    badge: 'Hot Pot',
    badgeClass: 'popular',
    desc: 'Steaming ceramic pot of premium whole-leaf loose tea (English Breakfast / Earl Grey / Chamomile).',
    image: 'assets/products/hot_latte.jpg',
    available: true,
    flavorProfile: 'Soothing Floral & Herbal Aromas, Pure Whole Leaf Clarity',
    pairings: ['snack_waffle', 'bf_classic_rise'],
    dietary: ['Hot Tea', 'Zero Sugar']
  },
  {
    id: 'bev_babyccino',
    name: 'Babyccino',
    category: 'beverages',
    price: 4.00,
    badge: 'Kids Friendly',
    badgeClass: 'popular',
    desc: 'Warm frothy steamed fresh milk dusted with chocolate powder and topped with mini marshmallows.',
    image: 'assets/products/cappuccino.jpg',
    available: true,
    flavorProfile: 'Sweet Vanilla Microfoam, Chocolate Dust, Fluffy Marshmallows',
    pairings: ['snack_churros_original', 'snack_waffle'],
    dietary: ['Caffeine Free', 'Kids Friendly']
  },
  {
    id: 'bev_mineral_water',
    name: 'Artisan Mineral Water',
    category: 'beverages',
    price: 1.50,
    badge: 'Pure Water',
    badgeClass: 'popular',
    desc: 'Pure mountain mineral spring water served chilled or at room temperature.',
    image: 'assets/products/americano.jpg',
    available: true,
    flavorProfile: 'Crisp, Pure, Refreshing Clean Hydration',
    pairings: [],
    dietary: ['Pure Water', 'Zero Calorie']
  }
];

// Existing Senopati Cafe Menu (36 items)
const existingDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
const senopatiMenu = Array.isArray(existingDb.menu) && existingDb.menu.length > 0 ? existingDb.menu : [
  { id: 'kopi_milk_aren', name: 'Kopi Milk Aren (Es)', category: 'kopi', price: 28000, badge: 'Best Seller', available: true, desc: 'Espresso bold, fresh milk creamy, gula aren asli.' }
];

const newDatabase = {
  defaultMerchantId: 'coffeenity',
  merchants: {
    coffeenity: {
      id: 'coffeenity',
      name: 'The Coffeenity Yard',
      brandUnit: 'Doughboy Pizza Kayu Api (@doughboy.pizzakyuapi)',
      tagline: 'Cafe, Artisan Filter Coffee, Wood-Fired Pizza, Breakfast & Bites',
      currency: 'BND',
      currencySymbol: '$',
      currencyDecimals: 2,
      taxRate: 0.00,
      taxLabel: 'Pajak (0%)',
      tablesCount: 12,
      paymentMethods: ['BIBD', 'BAIDURI', 'POCKET', 'CASH'],
      defaultLanguage: 'ms-BN',
      menu: coffeenityMenu,
      orders: [
        {
          id: 'ORD_COFF_01',
          orderNumber: '#04KBF7',
          merchantId: 'coffeenity',
          table: 'Meja 4',
          tableNum: 4,
          items: [
            {
              itemId: 'pizza_burger',
              name: 'Burger Pizza',
              price: 14.00,
              basePrice: 8.00,
              addonPrice: 6.00,
              qty: 1,
              subtext: 'Large (12")',
              image: 'assets/products/beef_burger.jpg'
            },
            {
              itemId: 'coffee_spanish_latte',
              name: 'Spanish Latte',
              price: 6.00,
              basePrice: 5.50,
              addonPrice: 0.50,
              qty: 2,
              subtext: 'Iced Option',
              image: 'assets/products/kopi_milk_aren.jpg'
            }
          ],
          subtotal: 26.00,
          tax: 0.00,
          total: 26.00,
          paymentMethod: 'BIBD',
          paymentStatus: 'PAID',
          status: 'preparing',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      waiterCalls: [],
      auditLogs: [
        {
          timestamp: new Date().toLocaleTimeString('id-ID'),
          action: 'MERCHANT_ONBOARDED',
          actor: 'System',
          detail: 'The Coffeenity Yard & Doughboy Pizza Kayu Api onboarded with 62 BND menu catalog.'
        }
      ],
      stats: {
        grossRevenue: 26.00,
        totalOrdersToday: 1,
        averageTicket: 26.00
      }
    },
    senopati_cafe: {
      id: 'senopati_cafe',
      name: 'Senopati Artisan Cafe',
      brandUnit: 'Kopi Kenangan Group',
      tagline: 'Specialty Coffee, Gourmet Pastry & Artisanal Bites',
      currency: 'IDR',
      currencySymbol: 'Rp',
      currencyDecimals: 0,
      taxRate: 0.10,
      taxLabel: 'PB1 (10%)',
      tablesCount: 8,
      paymentMethods: ['QRIS', 'BCA', 'MANDIRI', 'CASH'],
      defaultLanguage: 'id-ID',
      menu: senopatiMenu,
      orders: existingDb.orders || [],
      waiterCalls: [],
      auditLogs: existingDb.auditLogs || [],
      stats: existingDb.stats || {
        grossRevenue: 4820000,
        totalOrdersToday: 48,
        averageTicket: 100416
      }
    }
  },
  aiConfig: {
    apiKey: existingDb.aiConfig?.apiKey || '',
    model: 'gemini-3.7-flash',
    tone: 'warm',
    temperature: 0.7,
    thinkingBudget: 512,
    maxOutputTokens: 600,
    remainingCredits: 48155,
    totalInputTokens: 1420,
    totalOutputTokens: 2880
  }
};

fs.writeFileSync(path.join(__dirname, '../data/db.json'), JSON.stringify(newDatabase, null, 2), 'utf8');
console.log('✅ Successfully seeded multi-tenant database!');
console.log(`Coffeenity items: ${newDatabase.merchants.coffeenity.menu.length}`);
console.log(`Senopati items: ${newDatabase.merchants.senopati_cafe.menu.length}`);
