// @ts-check

// Use JSDoc annotations for type safety
/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/

// The configured entrypoint for the 'purchase.delivery-customization.run' extension target
/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function run(input) {
  // The message to be added to the delivery option
  const message = "May be delayed due to weather conditions";
  
  let is_personalised = false;
  const skus = input.cart.lines
    .map(line => line.merchandise?.sku) // Get SKU
    .filter(sku => sku && sku.includes("PERSONALISE_"));

  if (skus.length > 0) {
    is_personalised = true;
  }

  let toRename = input.cart.deliveryGroups
  // Filter only those with a valid provinceCode
  .filter(group => group.deliveryAddress?.countryCode)
  // Map over delivery options for each group
  .flatMap(group => {
    const countryCode = group.deliveryAddress?.countryCode;
    const customDeliveryOpts = input.deliveryCustomization?.metafield?.value ? JSON.parse(input.deliveryCustomization?.metafield?.value) : [];

    return group.deliveryOptions.map(option => {
      let title = option.title || '';
      if(is_personalised) {
        const customCoutryCodes = JSON.parse(customDeliveryOpts.countryCode);
        customCoutryCodes.map((code, index) => {
          const message = JSON.parse(customDeliveryOpts.message)[index];
          if(code == countryCode && title.includes(message.titleSeg)) {
            title = title.replace(message.currentVal, message.newVal);
          }
        })
      }

      return /** @type {Operation} */ ({
        rename: {
          deliveryOptionHandle: option.handle,
          title: title
        }
      });
    });
  });

  // The @shopify/shopify_function package applies JSON.stringify() to your function result
  // and writes it to STDOUT
  return {
    operations: toRename
  };
};