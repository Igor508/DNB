import { useState, useEffect } from "react";
import {
  Banner,
  Card,
  InlineGrid,
  InlineStack,
  Box,
  Layout,
  Page,
  TextField,
  Button
} from "@shopify/polaris";
import {DeleteIcon} from '@shopify/polaris-icons';
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ params, request }) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query {
        discountNodes(first: 10) {
          edges {
            node {
              id
              metafield(namespace: "shipping-customization", key: "function-configuration") {
                id
                value
              }
            }
          }
        }
      }`
  );

  const responseJson = await response.json();
  const discountNodes = responseJson.data.discountNodes?.edges;
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      discountNodes: discountNodes
    }),
  };
}

export const action = async ({ params, request }) => {
  const { functionId, id } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const metafieldInput = formData.get("metafields");

  let metafieldsData = [];
    metafieldsData = JSON.parse(metafieldInput);
    const allShippingPrice = metafieldsData.map(item => item.shippingPrice).join(", ");
    const allMinAmount = metafieldsData.map(item => item.minAmount).join(", ");
    const allMaxAmount = metafieldsData.map(item => item.maxAmount).join(", ");
    const allPercentage = metafieldsData.map(item => item.percentage).join(", ");
    const configValue = JSON.stringify({
      shippingPrice: allShippingPrice,
      minAmount: allMinAmount,
      maxAmount: allMaxAmount,
      percentage: allPercentage
    });
    const response = await admin.graphql(
      `#graphql
        mutation {
          metafieldsSet(metafields: [
            {
              ownerId: "gid://shopify/DiscountAutomaticNode/${id}"
              namespace: "shipping-customization"
              key: "function-configuration"
              value: "${configValue.replace(/"/g, '\\"')}"
              type: "json"
            }
          ]) {
            metafields {
              id
            }
            userErrors {
              message
            }
          }
        }`
    );
    const responseJson = await response.json();
    return json({success: responseJson.data});
}

export default function ShippingDiscountSettings() {
  const loaderData = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const [fields, setFields] = useState([
    { shippingPrice: 0, minAmount: 0, maxAmount: 0, percentage: 0 }
  ])
  
  const handleChange = (value, name, index) => {
    const updatedFields = [...fields];
    updatedFields[index][name] = value;
    setFields(updatedFields);
  };

  const handleSubmit = () => {
    submit({ metafields: JSON.stringify(fields) }, { method: "post" });
  };

  const addField = () => {
    setFields([...fields, { shippingPrice: 0, minAmount: 0, maxAmount: 0, percentage: 0 }]);
  };

  const removeField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  const isLoading = navigation.state === "submitting";

  useEffect(() => {
    if (loaderData) {
      const metafields = JSON.parse(loaderData.body)?.discountNodes[0] || {};
      const metafieldVal = JSON.parse(metafields?.node?.metafield?.value) || {};
      const shippingPrices = metafieldVal?.shippingPrice?.split(',').map(s => parseFloat(s.trim())) || [];
      const minAmounts = metafieldVal?.minAmount?.split(',').map(s => parseFloat(s.trim())) || [];
      const maxAmounts = metafieldVal?.maxAmount?.split(',').map(s => parseFloat(s.trim())) || [];
      const percentages = metafieldVal?.percentage?.split(',').map(s => parseFloat(s.trim())) || [];

      const metafieldsArr = shippingPrices.map((price, index) => ({
        shippingPrice: price,
        minAmount: minAmounts[index],
        maxAmount: maxAmounts[index],
        percentage: percentages[index]
      }));

      setFields(metafieldsArr)
    }
  }, [loaderData])

  return (
    <Page fullWidth
    title="Change shipping discount settings"
    backAction={{
      content: "Shipping customization",
      onAction: () => open('shopify:admin/settings/shipping/customizations', '_top')
    }}
    primaryAction={{
      content: "Save",
      loading: isLoading,
      onAction: handleSubmit,
    }}
    secondaryActions={[
      {
        content: 'Add',
        onAction: addField
      }
    ]}
  >
    <Form method="post">
      <Layout>
        {fields.map((field, index) => (
          <Layout.Section >
            <Card>
              <InlineGrid columns={1} gap={300}>
                <Box>
                  <TextField
                    name="shippingPrice"
                    type="number"
                    label="Current shipping Price"
                    value={field.shippingPrice}
                    onChange={(newValue) => handleChange(newValue, 'shippingPrice', index)}
                    disabled={isLoading}
                    requiredIndicator
                    autoComplete="on"
                  />
                </Box>
                <InlineGrid columns={2} gap={300}>
                  <Box>
                    <TextField
                      name="minAmount"
                      type="number"
                      label="Minimum Order Amount"
                      value={field.minAmount}
                      onChange={(newValue) => handleChange(newValue, 'minAmount', index)}
                      disabled={isLoading}
                      requiredIndicator
                      autoComplete="off"
                    />
                  </Box>
                  <Box>
                    <TextField
                      name="maxAmount"
                      type="number"
                      label="Maximum Order Amount"
                      value={field.maxAmount}
                      onChange={(newValue) => handleChange(newValue, 'maxAmount', index)}
                      disabled={isLoading}
                      requiredIndicator
                      autoComplete="off"
                    />
                  </Box>
                </InlineGrid>
                <Box>
                  <TextField
                    name="percentage"
                    type="number"
                    label="New shipping price (percentage of order amount)"
                    value={field.percentage}
                    onChange={(newValue) => handleChange(newValue, 'percentage', index)}
                    disabled={isLoading}
                    requiredIndicator
                    autoComplete="on"
                  />
                </Box>
                <InlineStack align="end">
                  <Button icon={DeleteIcon} accessibilityLabel="Remove stateCountry" onClick={() => removeField(index)} />
                </InlineStack>
              </InlineGrid>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
    </Form>
  </Page>
  );
}