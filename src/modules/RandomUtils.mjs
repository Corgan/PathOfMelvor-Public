export class RandomUtils {
  /**
   * @param {object} manifest - The manifest object used to access namespace.
   * @param {object} config - Configuration object containing rarity information and crafting percentages.
   */
  constructor(manifest, config) {
    this.config = config;
    this.manifest = manifest;
    this.craftingRarityPercentage = config.craftingRarityPercentage;
    this.rarityWeights = {
      normal: 100,
      uncommon: config.rarities[0].weight,
      rare: config.rarities[1].weight,
      legendary: config.rarities[2].weight
    };
    //Sum the weights
    this.sumOfWeights = Object.values(this.rarityWeights).reduce((a, b) => a + b, 0);
  }

  /**
   * Returns true if the item has modded variants
   *
   * @param {object} itemRef - Reference to the item
   * @returns {boolean} A boolean representing whether this item has modded variants
   */
  checkIfItemHasVariants(itemRef) {
    return game.items.equipment.registeredObjects.has(`${this.manifest.namespace}:${itemRef.localID}_uncommon_0`);
  }

  /**
   * Returns the vanilla namespace + local ID, or the namespace + local ID of an item variant if the random roll succeeds
   *
   * @param {object} itemRef - Item to roll for a random variant
   * @returns {string} A string containing the ID of the selected variant, or the vanilla item if a variant does not exist
   */
  getRandomVariant(itemRef) {
    // Check if product has modded variants
    if (this.checkIfItemHasVariants(itemRef)) {
      // Randomly select rarity based on weights
      let roll = Math.floor(Math.random() * this.sumOfWeights);

      // Stop if roll is under base weight (no change)
      if (roll < this.rarityWeights.normal) {
        return `${itemRef.namespace}:${itemRef.localID}`;
      }

      let chosenRarity = null;
      let amountToGenerate = 0;

      for (const rarity of this.config.rarities) {
        roll -= this.rarityWeights[rarity.name];
        if (roll < this.rarityWeights.normal) {
          chosenRarity = rarity.name;
          amountToGenerate = rarity.amountToGenerate;
          break;
        }
      }

      // Select random number based on amountToGenerate
      const itemIndex = Math.floor(Math.random() * amountToGenerate);

      return `${this.manifest.namespace}:${itemRef.localID}_${chosenRarity}_${itemIndex}`;
    }
    return `${itemRef.namespace}:${itemRef.localID}`;
  }

  /**
   * Re-rolls the product for the skill if it matches a modded item based on configured rarities and their weights.
   *
   * @param {function} skillFunction - Function to be called after rerolling the product.
   * @param {object} skill - Skill that is producing the product.
   */
  rerollSkillProduct(skillFunction, skill) {
    let product = skill.selectedRecipe.product;
    //Check if the last action rolled the selectedRecipe into a modded variant. If so, reset it to the vanilla item
    if (product.vanillaID) {
      skill.selectedRecipe.product = game.items.equipment.registeredObjects.get(product.vanillaID);
    }

    //Check if the vanilla product has modded variants
    if (this.checkIfItemHasVariants(product)) {
        // Roll to determine if product should be modified, depending on craftingRarityPercentage
        if (Math.floor(Math.random() * 100) < this.craftingRarityPercentage 
        && skill 
        && skill.selectedRecipe 
        && skill.selectedRecipe.product) {

        product = skill.selectedRecipe.product;
        const newProduct = game.items.equipment.registeredObjects.get(this.getRandomVariant(product));
        newProduct.vanillaID = `${product.namespace}:${product.localID}`;

        // Assign the new product
        skill.selectedRecipe.product = newProduct;
      }
    }

    return skillFunction();
  }
}
