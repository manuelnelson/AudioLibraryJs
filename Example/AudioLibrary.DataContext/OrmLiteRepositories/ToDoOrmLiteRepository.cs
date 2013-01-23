using System.Collections.Generic;
using System.Data;
using AudioLibrary.DataInterface;
using AudioLibrary.Models;
using ServiceStack.OrmLite;

namespace AudioLibrary.DataContext.OrmLiteRepositories
{
    public class ToDoOrmLiteRepository : OrmLiteRepository<ToDo>, IToDoRepository
    {
        public ToDoOrmLiteRepository(IDbConnectionFactory dbFactory) : base(dbFactory)
        {
        }


        public IEnumerable<ToDo> GetRecent()
        {
            using (IDbConnection db = DbFactory.OpenDbConnection())
            {
                return
                    db.Query<ToDo>(
                        "SELECT Top(@pageSize) [Project1].[Id] AS [Id], [Project1].[Task] AS [Task], [Project1].[Completed] AS [Completed] FROM [dbo].[ToDos]  AS [Project1] ORDER BY [Project1].[Id] DESC",
                        new
                            {
                                pageSize = 10
                            });
            }
        }

        public override void CreateMissingTables()
        {
            base.CreateMissingTables();
            using (IDbConnection db = DbFactory.OpenDbConnection())
            {
                var count = db.Scalar<int>("SELECT count(*) FROM [dbo].[ToDos]");
                if (count == 0)
                {
                    //Seed data
                    db.Insert(new ToDo {Task = "Pick up laundry"});
                    db.Insert(new ToDo {Task = "Do the dishes"});
                }
            }
        }
    }
}