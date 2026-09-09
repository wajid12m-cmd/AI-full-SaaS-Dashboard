type Activity = {
  action: string;
  date: string;
};

type RecentActivityProps = {
  activities: Activity[];
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-50">
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          No recent activity.
        </p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity, index) => (
            <li
              key={index}
              className="flex items-center justify-between text-gray-800 dark:text-gray-200"
            >
              <span>{activity.action}</span>
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                {new Date(activity.date).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}