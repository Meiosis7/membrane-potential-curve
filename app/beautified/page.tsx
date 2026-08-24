import { MembraneCurveLab } from "../../models/03-membrane-potential-curve/MembraneCurveLab";
import "../../models/03-membrane-potential-curve/membrane-curve.css";
import "../../models/03-membrane-potential-curve/membrane-beautified.css";

export default function BeautifiedPage() {
  return <MembraneCurveLab visualVariant="beautified" />;
}
