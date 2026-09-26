import { HiOutlineHome, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/States.jsx";

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <Card className="mt-6">
      <EmptyState
        icon={HiOutlineMagnifyingGlass}
        title={t("errors.routeNotFound")}
        description={t("common.noData")}
        action={
          <Button to="/" icon={HiOutlineHome}>
            {t("common.goHome")}
          </Button>
        }
      />
    </Card>
  );
}
