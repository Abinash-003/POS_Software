import { useEffect, useMemo, useState } from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { useLanguage, localName } from "../../i18n/LanguageProvider.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useErrorToast } from "../../hooks/useApiError.js";
import { sendForm } from "../../lib/apiClient.js";
import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, MoneyInput, Select } from "../ui/Field.jsx";
import { BilingualFields } from "../ui/BilingualFields.jsx";
import { ImagePicker } from "../ui/ImagePicker.jsx";

const UNITS = ["piece", "packet", "box", "kg", "gram", "litre", "bottle", "other"];

const EMPTY = {
  nameEn: "",
  nameTa: "",
  sku: "",
  barcode: "",
  brand: "",
  category: "",
  purchasePrice: "",
  sellingPrice: "",
  stock: "",
  minimumStock: "5",
  unit: "piece",
};

function toFormState(product) {
  if (!product) return EMPTY;
  return {
    nameEn: product.nameEn || "",
    nameTa: product.nameTa || "",
    sku: product.sku || "",
    barcode: product.barcode || "",
    brand: product.brand || "",
    category: product.category?._id || product.category || "",
    purchasePrice: String(product.purchasePrice ?? ""),
    sellingPrice: String(product.sellingPrice ?? ""),
    stock: String(product.stock ?? ""),
    minimumStock: String(product.minimumStock ?? 5),
    unit: product.unit || "piece",
  };
}

/**
 * Create / edit form. Everything is submitted as multipart so the optional
 * product photo travels with the record in a single request.
 */
export function ProductFormModal({ open, product, categories, onClose, onSaved }) {
  const { t, language } = useLanguage();
  const toast = useToast();
  const showError = useErrorToast();

  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(product?._id);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(product));
    setFile(null);
    setRemoveImage(false);
    setErrors({});
    setSaving(false);
  }, [open, product]);

  const set = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const marginWarning = useMemo(() => {
    const purchase = Number(form.purchasePrice);
    const selling = Number(form.sellingPrice);
    return purchase > 0 && selling > 0 && selling < purchase;
  }, [form.purchasePrice, form.sellingPrice]);

  const validate = () => {
    const next = {};
    if (!form.nameEn.trim()) next.nameEn = t("common.required");
    if (!form.nameTa.trim()) next.nameTa = t("common.required");
    if (!form.sku.trim()) next.sku = t("common.required");
    if (form.sellingPrice === "" || Number(form.sellingPrice) < 0) {
      next.sellingPrice = t("errors.positive");
    }
    if (form.purchasePrice !== "" && Number(form.purchasePrice) < 0) {
      next.purchasePrice = t("errors.positive");
    }
    if (form.stock !== "" && Number(form.stock) < 0) next.stock = t("errors.positive");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const fields = {
        nameEn: form.nameEn.trim(),
        nameTa: form.nameTa.trim(),
        sku: form.sku.trim().toUpperCase(),
        barcode: form.barcode.trim(),
        brand: form.brand.trim(),
        category: form.category,
        purchasePrice: form.purchasePrice === "" ? 0 : Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        minimumStock: form.minimumStock === "" ? 5 : Number(form.minimumStock),
        unit: form.unit,
        ...(isEdit ? { removeImage } : {}),
        // Stock is only editable on create; afterwards it moves through
        // Stock In and sales so the ledger always explains the number.
        ...(isEdit ? {} : { stock: form.stock === "" ? 0 : Number(form.stock) }),
      };

      const data = await sendForm(isEdit ? `/products/${product._id}` : "/products", {
        method: isEdit ? "put" : "post",
        fields,
        file,
      });

      toast.success(t(isEdit ? "products.updated" : "products.added"), data.product.nameEn);
      onSaved?.(data.product);
      onClose();
    } catch (error) {
      if (error.code === "duplicateSku") setErrors({ sku: t("errors.duplicateSku") });
      else if (error.code === "duplicateBarcode") setErrors({ barcode: t("errors.duplicateBarcode") });
      else showError(error);
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={t(isEdit ? "products.editProduct" : "products.addProduct")}
      subtitle={isEdit ? product.sku : undefined}
      size="lg"
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="product-form" className="flex-[2]" loading={saving}>
            {saving ? t("common.saving") : t(isEdit ? "common.saveChanges" : "common.add")}
          </Button>
        </div>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-4 p-4 sm:p-5" noValidate>
        <ImagePicker
          label={t("image.label")}
          value={product?.image}
          onFileChange={setFile}
          onRemoveChange={setRemoveImage}
        />

        <BilingualFields
          enLabel={t("products.nameEn")}
          taLabel={t("products.nameTa")}
          enPlaceholder={t("products.nameEnPh")}
          taPlaceholder={t("products.nameTaPh")}
          enValue={form.nameEn}
          taValue={form.nameTa}
          onEnChange={(value) => {
            setForm((current) => ({ ...current, nameEn: value }));
            setErrors((current) => ({ ...current, nameEn: undefined }));
          }}
          onTaChange={(value) => {
            setForm((current) => ({ ...current, nameTa: value }));
            setErrors((current) => ({ ...current, nameTa: undefined }));
          }}
          enError={errors.nameEn}
          taError={errors.nameTa}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("products.sku")}
            placeholder={t("products.skuPh")}
            value={form.sku}
            onChange={set("sku")}
            error={errors.sku}
            autoCapitalize="characters"
            required
          />
          <Input
            label={t("products.barcode")}
            placeholder={t("products.barcodePh")}
            value={form.barcode}
            onChange={set("barcode")}
            error={errors.barcode}
            inputMode="numeric"
          />
          <Select
            label={t("products.category")}
            value={form.category}
            onChange={set("category")}
          >
            <option value="">{t("products.uncategorised")}</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {localName(category, language)}
              </option>
            ))}
          </Select>
          <Input
            label={t("products.brand")}
            placeholder={t("products.brandPh")}
            value={form.brand}
            onChange={set("brand")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput
            label={t("products.purchasePrice")}
            value={form.purchasePrice}
            onChange={set("purchasePrice")}
            error={errors.purchasePrice}
          />
          <MoneyInput
            label={t("products.sellingPrice")}
            value={form.sellingPrice}
            onChange={set("sellingPrice")}
            error={errors.sellingPrice}
            required
          />
        </div>

        {marginWarning ? (
          <p className="flex items-start gap-2 rounded-xl bg-warn-50 px-3 py-2.5 text-xs font-medium text-warn-700 animate-slide-down">
            <HiOutlineExclamationTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
            {t("products.priceWarning")}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label={t("products.unit")} value={form.unit} onChange={set("unit")}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {t(`units.${unit}`)}
              </option>
            ))}
          </Select>

          {isEdit ? (
            <Input
              label={t("products.stock")}
              value={form.stock}
              disabled
              help={t("products.restock")}
            />
          ) : (
            <Input
              label={t("products.stock")}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.stock}
              onChange={set("stock")}
              error={errors.stock}
            />
          )}

          <Input
            label={t("products.minStock")}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.minimumStock}
            onChange={set("minimumStock")}
          />
        </div>
      </form>
    </Modal>
  );
}
