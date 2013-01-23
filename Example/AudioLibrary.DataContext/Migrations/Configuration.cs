using System.Data.Entity.Migrations;
using System.Linq;
using AudioLibrary.Models;

namespace AudioLibrary.DataContext.Migrations
{
    public class Configuration : DbMigrationsConfiguration<DataContext>
    {
        public Configuration()
        {
            AutomaticMigrationsEnabled = true;
            AutomaticMigrationDataLossAllowed = true;
        }

        protected override void Seed(DataContext context)
        {
            //put seed data here

            //only seed if no data exists
            if (!context.Set<ToDo>().Any())
            {
                context.Todos.Add(new ToDo
                    {
                        Task = "Do the laundry"
                    });
                context.Todos.Add(new ToDo
                    {
                        Task = "Take out the garbage"
                    });
                context.SaveChanges();
            }
        }
    }
}