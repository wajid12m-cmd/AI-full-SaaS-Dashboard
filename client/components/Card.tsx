type CardProps = {
  title: string;
  value: string;
};

export default function Card({ title, value }: CardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border dark:border-gray-700 transition-colors">
      <h3 className="text-gray-500 dark:text-gray-400 text-sm">{title}</h3>

      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-50">
        {value}
      </p>
    </div>
  );
}